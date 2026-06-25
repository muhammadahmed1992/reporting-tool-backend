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
export class SalesAnalystReport implements ReportStrategy {
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
        const safeSortOrder: 'ASC' | 'DESC' =
            sortDirection && String(sortDirection).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const decodedWarehouse: string | null =
            warehouse ? decodeURIComponent(String(warehouse)) : null;

        const decodedStockGroup: string | null =
            stockGroup ? decodeURIComponent(String(stockGroup)) : null;

        const safeSearchValue: string =
            searchValue ? String(searchValue).trim() : '';

        const filterColumns: string[] = columnsToFilter
            ? String(columnsToFilter)
                  .split(',')
                  .map((item: string) => item.trim())
                  .filter((item: string) => item.length > 0)
            : [];

        /**
         * Whitelist for ORDER BY columns.
         * Only allow known output aliases or approved numeric expressions.
         */
        const sortColumnMap: Record<string, string> = {
            stock_id_header: 'stock_id_header',
            stock_name_header: 'stock_name_header',
            qty_header: 'CAST(REPLACE(qty_header, \',\', \'\') AS SIGNED)',
            currency_header: 'currency_header',
            amount_header: 'CAST(REPLACE(amount_header, \',\', \'\') AS SIGNED)',
            amount_tax_header: 'CAST(REPLACE(amount_tax_header, \',\', \'\') AS SIGNED)',
            subtotal_header: 'CAST(REPLACE(subtotal_header, \',\', \'\') AS SIGNED)',
            amount_tax_total_header: 'CAST(REPLACE(amount_tax_total_header, \',\', \'\') AS SIGNED)'
        };

        /**
         * Safe ORDER BY logic.
         */
        let sortBy = '';

        if (!sortColumn || sortColumn === 'currency_header' || sortColumn === 'stock_id_header') {
            if (sortColumn === 'currency_header') {
                sortBy = `currency_header ${safeSortOrder}, stock_id_header ASC`;
            } else if (sortColumn === 'stock_id_header') {
                sortBy = `currency_header ASC, stock_id_header ${safeSortOrder}`;
            } else {
                sortBy = `currency_header ASC, stock_id_header ASC`;
            }
        } else if (sortColumn === 'stock_name_header') {
            sortBy = `currency_header ASC, stock_name_header ${safeSortOrder}, stock_id_header ASC`;
        } else {
            const mappedSortColumn = sortColumnMap[String(sortColumn)];
            if (mappedSortColumn) {
                sortBy = `currency_header ASC, ${mappedSortColumn} ${safeSortOrder}, stock_id_header ASC`;
            } else {
                sortBy = `currency_header ASC, stock_id_header ASC`;
            }
        }

        /**
         * Whitelist for search/filter columns.
         * These columns must exist in the inner SELECT scope where the WHERE clause is built.
         */
        const searchableColumnMap: Record<string, string> = {
            stock_id_header: 'cstdcode',
            stock_name_header: 'LTRIM(RTRIM(cstkdesc))',
            currency_header: 'cexcdesc'
        };

        parameters.push(startDate);
        parameters.push(endDate);

        let query = `
SELECT
    StockID AS stock_id_header,
    StockName AS stock_name_header,
    FORMAT(Qty, 0) AS qty_header,
    Currency AS currency_header,
    FORMAT(Amount, 0) AS amount_header,
    FORMAT(Amount_Tax, 0) AS amount_tax_header,
    FORMAT(
        IF(
            @currentGroup <> Currency,
            IF(@currentGroup := Currency, @currentSum := Amount, @currentSum := Amount),
            @currentSum := @currentSum + Amount
        ),
        0
    ) AS subtotal_header,
    FORMAT(
        IF(
            @currentGroupAmountTax <> Currency,
            IF(@currentGroupAmountTax := Currency, @currentSumAmountTax := Amount_Tax, @currentSumAmountTax := Amount_Tax),
            @currentSumAmountTax := @currentSumAmountTax + Amount_Tax
        ),
        0
    ) AS amount_tax_total_header
FROM (
    SELECT
        cstdcode AS StockID,
        LTRIM(RTRIM(cstkdesc)) AS StockName,
        SUM(tqty) AS Qty,
        cexcdesc AS Currency,
        SUM(semua - IF(cinvspecial = 'RJ' OR cinvspecial = 'RS', -ninvdisc, ninvdisc) / rows2) AS Amount,
        SUM(
            (semua - IF(cinvspecial = 'RJ' OR cinvspecial = 'RS', -ninvdisc, ninvdisc) / rows2)
            * (1 + IF(nivdstkppn = 1, ninvtax / 100, 0))
        ) AS Amount_Tax
    FROM
        (
            SELECT
                civdfkinv,
                COUNT(1) AS rows2
            FROM invoicedetail
            INNER JOIN invoice
                ON cinvpk = civdfkinv
            WHERE nIVDkirim = 1
            GROUP BY civdfkinv
        ) AS a
    INNER JOIN
        (
            SELECT
                civdpk,
                nstkppn,
                cinvspecial,
                civdfkinv,
                cstdcode,
                cstkdesc,
                cexcdesc,
                ninvdisc,
                nivdstkppn,
                ninvtax,
                (-nIVDzqtyin + nIVDzqtyout) AS tqty,
                (
                    IF(cinvspecial = 'RJ' OR cinvspecial = 'RS', -nIVDAmount, nIVDAmount)
                    * (1 - nINVdisc1 / 100)
                    * (1 - nINVdisc2 / 100)
                    * (1 - nINVdisc3 / 100)
                ) AS semua
            FROM invoice
            INNER JOIN invoicedetail
                ON cINVpk = cIVDfkINV
            INNER JOIN exchange
                ON cINVfkexc = cexcpk
            INNER JOIN stock
                ON cIVDfkSTK = cSTKpk
            INNER JOIN stockdetail
                ON cSTKpk = cSTDfkSTK
            WHERE nstdkey = 1
              AND nIVDkirim = 1
              AND (cINVspecial = 'JL' OR cINVspecial = 'RJ' OR cINVspecial = 'PS' OR cINVspecial = 'RS')
              AND dinvdate >= ?
              AND dinvdate <= ?
`;

        const validSearchExpressions: string[] = filterColumns
            .map((column: string) => searchableColumnMap[column])
            .filter((column: string | undefined): column is string => Boolean(column));

        if (safeSearchValue && validSearchExpressions.length > 0) {
            query += ` AND (`;
            query += validSearchExpressions.map((column: string) => `${column} LIKE ?`).join(' OR ');
            query += `)`;
            for (let i = 0; i < validSearchExpressions.length; i++) {
                parameters.push(`%${safeSearchValue}%`);
            }
        }

        if (decodedWarehouse) {
            query += ` AND (cinvfkwhs = ? OR cinvfkwhs IS NULL)`;
            parameters.push(decodedWarehouse);
        }

        if (decodedStockGroup) {
            query += ` AND (cstkfkgrp = ? OR cstkfkgrp IS NULL)`;
            parameters.push(decodedStockGroup);
        }

        query += `
            ORDER BY cexcdesc, cstdcode
        ) AS b
        ON a.civdfkinv = b.civdfkinv
    GROUP BY cstdcode, cstkdesc, cexcdesc
) AS c,
(
    SELECT
        @currentGroup := '',
        @currentSum := 0,
        @currentGroupAmountTax := '',
        @currentSumAmountTax := 0
) AS r
ORDER BY ${sortBy}
`;

        console.log(`query: ${query}`);
        console.log(`parameters: ${JSON.stringify(parameters)}`);
        console.log(`Report Name: ${ReportName.Sales_Analyst}`);
        console.log('warehouse: ', decodedWarehouse);
        console.log('stockGroup: ', decodedStockGroup);
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