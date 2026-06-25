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
export class SalesAnalyst2Report implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        const { startDate, endDate, warehouse, stockGroup, sortColumn, sortDirection, searchValue, columnsToFilter } = queryString;

        // Default sort order
        const sortOrder = sortDirection || 'ASC';
        let sortBy: string;

        switch (sortColumn) {
            case 'currency_header':
                sortBy = `currency_header ${sortOrder}, stock_id_header`;
                break;
            case 'stock_name_header':
                sortBy = `currency_header, stock_name_header`;
                break;
            case 'date_header':
                sortBy = `currency_header, STR_TO_DATE(date_header, '%Y-%m-%d') ${sortOrder}, invoice_header`;
                break;
            case 'stock_id_header':
            default:
                sortBy = `currency_header, CAST(REPLACE(${sortColumn || 'stock_id_header'}, ',', '') AS SIGNED) ${sortOrder}, stock_id_header`;
        }

        // Query parameters
        const parameters: any[] = [startDate, endDate];
        const filterColumns = columnsToFilter?.toString().split(',').map(c => c.trim()) || [];

        // Base query
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
                    TRIM(cstkdesc) AS StockName,
                    SUM(-nIVDzqtyin + nIVDzqtyout) AS Qty,
                    cexcdesc AS Currency,
                    SUM(
                        IF(cinvspecial IN ('RJ', 'RS'), -nIVDAmount, nIVDAmount)
                        * (1 - nINVdisc1/100) * (1 - nINVdisc2/100) * (1 - nINVdisc3/100)
                    ) AS Amount,
                    SUM(
                        IF(cinvspecial IN ('RJ', 'RS'), -nIVDAmount, nIVDAmount)
                        * (1 - nINVdisc1/100) * (1 - nINVdisc2/100) * (1 - nINVdisc3/100)
                        * (1 + IF(nivdstkppn = 1, ninvtax / 100, 0))
                    ) AS Amount_Tax
                FROM invoice
                INNER JOIN invoicedetail ON cINVpk = cIVDfkINV
                INNER JOIN exchange ON cINVfkexc = cexcpk
                INNER JOIN stock ON cIVDfkSTK = cSTKpk
                INNER JOIN stockdetail ON cSTKpk = cSTDfkSTK
                WHERE nstdkey = 1
                  AND nIVDkirim = 1
                  AND cINVspecial IN ('JL', 'RJ', 'PS', 'RS')
                  AND dinvdate BETWEEN ? AND ?`;

        // Search filter
        if (searchValue && filterColumns.length) {
            query += ` AND (${filterColumns.map(c => `${c} LIKE ?`).join(' OR ')})`;
            parameters.push(...filterColumns.map(() => `%${searchValue}%`));
        }

        // Stock group filter
        if (stockGroup) {
            query += ` AND (IFNULL(?, cstkfkgrp) = cstkfkgrp OR cstkfkgrp IS NULL)`;
            parameters.push(decodeURIComponent(stockGroup));
        }

        // Warehouse filter
        if (warehouse) {
            query += ` AND (IFNULL(?, cinvfkwhs) = cinvfkwhs OR cinvfkwhs IS NULL)`;
            parameters.push(decodeURIComponent(warehouse));
        }

        // Grouping and final query
        query += `
                GROUP BY cstdcode, cstkdesc, cexcdesc
            ) AS c, (SELECT @currentGroup := '', @currentSum := 0, @currentGroupAmountTax := '', @currentSumAmountTax := 0) r
            ORDER BY ${sortBy};
        `;

        console.log(`Query: ${query}`);
        console.log(`Report Name: ${ReportName.Sales_Analyst_No_Disc}`);
        console.log(`Start Date: ${startDate}, End Date: ${endDate}`);
        console.log(`Warehouse: ${warehouse}, StockGroup: ${stockGroup}`);
        console.log('==================================================');

        // Execute query
        const response = await this.genericRepository.query<SalesAnalystDTO>(query, parameters);

        return response?.length
            ? ResponseHelper.CreateResponse<SalesAnalystDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS)
            : ResponseHelper.CreateResponse<SalesAnalystDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
    }
}