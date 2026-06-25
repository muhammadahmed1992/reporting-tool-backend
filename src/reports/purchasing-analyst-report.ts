import { Injectable, HttpStatus } from '@nestjs/common';
import { GenericRepository } from '../repository/generic.repository';
import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { SalesAnalystDTO } from '../dto/sales-analyst.dto';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class PurchaseAnalystReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        const {
            startDate,
            endDate,
            warehouse,
            stockGroup,
            sortColumn,
            sortDirection,
            searchValue,
            columnsToFilter
        } = queryString;

        const parameters: any[] = [];

        const warehouseValue = warehouse ? decodeURIComponent(warehouse) : null;
        const stockGroupValue = stockGroup ? decodeURIComponent(stockGroup) : null;
        const sortOrder = String(sortDirection).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        /**
         * Whitelist sortable output columns only.
         * Never inject raw sortColumn into SQL.
         */
        const sortMap: Record<string, string> = {
            stock_id_header: 'c.StockID',
            stock_name_header: 'c.StockName',
            qty_header: 'c.Qty',
            currency_header: 'c.Currency',
            amount_header: 'c.Amount',
            amount_tax_header: 'c.Amount_Tax',
            subtotal_header: 'c.Amount',
            amount_tax_total_header: 'c.Amount_Tax'
        };

        let sortBy = 'c.Currency ASC, c.StockID ASC';

        if (!sortColumn || sortColumn === 'stock_id_header') {
            sortBy = `c.Currency ASC, c.StockID ${sortOrder}`;
        } else if (sortColumn === 'currency_header') {
            sortBy = `c.Currency ${sortOrder}, c.StockID ASC`;
        } else if (sortColumn === 'stock_name_header') {
            sortBy = `c.Currency ASC, c.StockName ${sortOrder}, c.StockID ASC`;
        } else if (sortMap[sortColumn]) {
            sortBy = `c.Currency ASC, ${sortMap[sortColumn]} ${sortOrder}, c.StockID ASC`;
        }

        /**
         * Only allow filtering on known physical columns.
         * Map UI column names to real SQL columns.
         */
        const filterColumnMap: Record<string, string> = {
            stock_id_header: 'sd.cstdcode',
            stock_name_header: 's.cstkdesc',
            currency_header: 'e.cexcdesc'
        };

        const requestedFilterColumns = columnsToFilter
            ? columnsToFilter.toString().split(',').map(item => item.trim())
            : [];

        const safeFilterColumns = requestedFilterColumns
            .map(col => filterColumnMap[col])
            .filter(Boolean);

        let searchClause = '';
        if (searchValue && safeFilterColumns.length > 0) {
            searchClause =
                ' AND (' + safeFilterColumns.map(col => `${col} LIKE ?`).join(' OR ') + ')';
            parameters.push(...safeFilterColumns.map(() => `%${searchValue}%`));
        }

        /**
         * Build selective WHERE clauses directly.
         * Avoid patterns like IFNULL(?, col) = col because they usually prevent index usage.
         */
        let optionalFilters = '';
        if (warehouseValue) {
            optionalFilters += ' AND i.cinvfkwhs = ?';
        }
        if (stockGroupValue) {
            optionalFilters += ' AND s.cstkfkgrp = ?';
        }

        /**
         * Push date params first because they appear first in SQL.
         */
        parameters.unshift(startDate, endDate);

        if (warehouseValue) {
            parameters.push(warehouseValue);
        }
        if (stockGroupValue) {
            parameters.push(stockGroupValue);
        }

        const query = `
            SELECT
                c.StockID AS stock_id_header,
                c.StockName AS stock_name_header,
                FORMAT(c.Qty, 0) AS qty_header,
                c.Currency AS currency_header,
                FORMAT(c.Amount, 0) AS amount_header,
                FORMAT(c.Amount_Tax, 0) AS amount_tax_header,
                FORMAT(
                    IF(@currentGroup <> c.Currency,
                        IF(@currentGroup := c.Currency, @currentSum := c.Amount, @currentSum := c.Amount),
                        @currentSum := @currentSum + c.Amount
                    ),
                    0
                ) AS subtotal_header,
                FORMAT(
                    IF(@currentGroupAmountTax <> c.Currency,
                        IF(@currentGroupAmountTax := c.Currency, @currentSumAmountTax := c.Amount_Tax, @currentSumAmountTax := c.Amount_Tax),
                        @currentSumAmountTax := @currentSumAmountTax + c.Amount_Tax
                    ),
                    0
                ) AS amount_tax_total_header
            FROM
            (
                SELECT
                    sd.cstdcode AS StockID,
                    TRIM(s.cstkdesc) AS StockName,
                    SUM(d.nivdzqtyin - d.nivdzqtyout) AS Qty,
                    e.cexcdesc AS Currency,
                    SUM(
                        (
                            (
                                IF(i.cinvspecial = 'RB', -d.nIVDAmount, d.nivdamount)
                                * (1 - i.nINVdisc1 / 100)
                                * (1 - i.nINVdisc2 / 100)
                                * (1 - i.nINVdisc3 / 100)
                            )
                            - IF(i.cinvspecial = 'RB', -i.ninvdisc, i.ninvdisc) / x.rows2
                        )
                    ) AS Amount,
                    SUM(
                        (
                            (
                                (
                                    IF(i.cinvspecial = 'RB', -d.nIVDAmount, d.nivdamount)
                                    * (1 - i.nINVdisc1 / 100)
                                    * (1 - i.nINVdisc2 / 100)
                                    * (1 - i.nINVdisc3 / 100)
                                )
                                - IF(i.cinvspecial = 'RB', -i.ninvdisc, i.ninvdisc) / x.rows2
                            )
                            * (1 + IF(d.nivdstkppn = 1, i.ninvtax / 100, 0))
                        )
                    ) AS Amount_Tax
                FROM invoice i
                INNER JOIN
                (
                    SELECT
                        id.civdfkinv,
                        COUNT(*) AS rows2
                    FROM invoicedetail id
                    WHERE id.nIVDkirim = 1
                    GROUP BY id.civdfkinv
                ) x
                    ON x.civdfkinv = i.cinvpk
                INNER JOIN invoicedetail d
                    ON d.cIVDfkINV = i.cINVpk
                   AND d.nIVDkirim = 1
                INNER JOIN exchange e
                    ON e.cexcpk = i.cINVfkexc
                INNER JOIN stock s
                    ON s.cSTKpk = d.cIVDfkSTK
                INNER JOIN stockdetail sd
                    ON sd.cSTDfkSTK = s.cSTKpk
                   AND sd.nstdkey = 1
                WHERE
                    i.cINVspecial IN ('BL', 'RB', 'KS')
                    AND i.dinvdate >= ?
                    AND i.dinvdate <= ?
                    ${searchClause}
                    ${optionalFilters}
                GROUP BY
                    sd.cstdcode,
                    s.cstkdesc,
                    e.cexcdesc
            ) c,
            (
                SELECT
                    @currentGroup := '',
                    @currentSum := 0,
                    @currentGroupAmountTax := '',
                    @currentSumAmountTax := 0
            ) vars
            ORDER BY ${sortBy}
        `;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Purchase_Analyst_Report}`);
        console.log('warehouse: ', warehouseValue);
        console.log('stockGroup: ', stockGroupValue);
        console.log(`=============================================`);

        const response = await this.genericRepository.query<SalesAnalystDTO>(query, parameters);

        if (response?.length) {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>(
                response,
                HttpStatus.OK,
                Constants.DATA_SUCCESS
            );
        } else {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>(
                [],
                HttpStatus.NOT_FOUND,
                Constants.DATA_NOT_FOUND
            );
        }
    }
}