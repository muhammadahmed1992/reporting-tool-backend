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
export class PurchaseAnalystReportNoDisc implements ReportStrategy {
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
            columnsToFilter,
        } = queryString;

        const sortOrder = sortDirection?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Determine SQL ORDER BY dynamically
        let sortBy = 'currency_header, stock_id_header';
        if (sortColumn) {
            switch (sortColumn) {
                case 'currency_header':
                    sortBy = `currency_header ${sortOrder}, stock_id_header`;
                    break;
                case 'stock_id_header':
                    sortBy = 'currency_header, stock_id_header';
                    break;
                case 'stock_name_header':
                    sortBy = 'currency_header, stock_name_header';
                    break;
                default:
                    sortBy = `currency_header, CAST(REPLACE(${sortColumn}, ',', '') AS SIGNED) ${sortOrder}, stock_id_header`;
                    break;
            }
        }

        const parameters: any[] = [startDate, endDate];

        let query = `
        SELECT 
            StockID AS stock_id_header,
            StockName AS stock_name_header,
            FORMAT(Qty, 0) AS qty_header,
            Currency AS currency_header,
            FORMAT(Amount, 0) AS amount_header,
            FORMAT(Amount_Tax, 0) AS amount_tax_header,
            FORMAT(
                IF(@currentGroup <> Currency,
                    IF(@currentGroup := Currency, @currentSum := 0, @currentSum := Amount),
                    @currentSum := @currentSum + Amount
                ), 0
            ) AS subtotal_header,
            FORMAT(
                IF(@currentGroupAmountTax <> Currency,
                    IF(@currentGroupAmountTax := Currency, @currentSumAmountTax := 0, @currentSumAmountTax := Amount_Tax),
                    @currentSumAmountTax := @currentSumAmountTax + Amount_Tax
                ), 0
            ) AS amount_tax_total_header
        FROM (
            SELECT 
                cstdcode AS StockID,
                LTRIM(RTRIM(cstkdesc)) AS StockName,
                SUM(nivdzqtyin - nivdzqtyout) AS Qty,
                cexcdesc AS Currency,
                SUM(
                    IF(cinvspecial='RB', -nIVDAmount, nivdamount)
                    * (1 - nINVdisc1 / 100)
                    * (1 - nINVdisc2 / 100)
                    * (1 - nINVdisc3 / 100)
                ) AS Amount,
                SUM(
                    IF(cinvspecial='RB', -nIVDAmount, nivdamount)
                    * (1 - nINVdisc1 / 100)
                    * (1 - nINVdisc2 / 100)
                    * (1 - nINVdisc3 / 100)
                    * (1 + IF(nivdstkppn = 1, ninvtax / 100, 0))
                ) AS Amount_Tax
            FROM invoice
            INNER JOIN invoicedetail ON cINVpk = cIVDfkINV
            INNER JOIN exchange ON cINVfkexc = cexcpk
            INNER JOIN stock ON cIVDfkSTK = cSTKpk
            INNER JOIN stockdetail ON cSTKpk = cSTDfkSTK
            WHERE nstdkey = 1 
              AND nIVDkirim = 1 
              AND cINVspecial IN ('BL', 'RB', 'KS', 'RS')
              AND dinvdate BETWEEN ? AND ?`;

        // Apply search filters
        const filterColumns = columnsToFilter?.toString().split(',').map(c => c.trim()) || [];
        if (searchValue && filterColumns.length) {
            query += ' AND (' + filterColumns.map(c => `${c} LIKE ?`).join(' OR ') + ')';
            parameters.push(...filterColumns.map(() => `%${searchValue}%`));
        }

        // Optional stock group and warehouse filters
        if (stockGroup) {
            query += ' AND (IFNULL(?, cstkfkgrp) = cstkfkgrp OR cstkfkgrp IS NULL)';
            parameters.push(decodeURIComponent(stockGroup));
        }

        if (warehouse) {
            query += ' AND (IFNULL(?, cinvfkwhs) = cinvfkwhs OR cinvfkwhs IS NULL)';
            parameters.push(decodeURIComponent(warehouse));
        }

        query += `
            GROUP BY cstdcode, cstkdesc, cexcdesc
        ) AS c, (SELECT @currentGroup := '', @currentSum := 0, @currentGroupAmountTax := '', @currentSumAmountTax := 0) r
        ORDER BY ${sortBy};`;

        console.log('Optimized Query:', query);

        const response = await this.genericRepository.query<SalesAnalystDTO>(query, parameters);

        if (response?.length) {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}