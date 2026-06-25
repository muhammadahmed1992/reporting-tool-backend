import { Injectable, HttpStatus } from '@nestjs/common';
import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository';

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { PurchasingReportNoDiscDTO } from 'src/dto/purchasing-report-no-disc.dto';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class PurchaseReportNoDisc implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        let {
            startDate,
            endDate,
            warehouse,
            sortColumn,
            sortDirection,
            searchValue,
            columnsToFilter
        } = queryString;

        const parameters: any[] = [];
        const safeSortOrder = String(sortDirection).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        const decodedWarehouse = warehouse ? decodeURIComponent(warehouse) : null;

        /**
         * Search columns allowed from outer query result set
         */
        const searchableColumnsMap: Record<string, string> = {
            invoice_header: 't.invoice_header',
            date_header: 'DATE_FORMAT(t.invoice_date, "%d-%m-%Y")',
            supplier_header: 't.supplier_header',
            currency_header: 't.currency_header',
            amount_header: 'CAST(t.amount_value AS SIGNED)'
        };

        /**
         * Sort columns allowed
         */
        const sortableColumnsMap: Record<string, string> = {
            invoice_header: 't.invoice_header',
            date_header: 't.invoice_date',
            supplier_header: 't.supplier_header',
            currency_header: 't.currency_header',
            amount_header: 't.amount_value'
        };

        /**
         * Build ORDER BY
         * Keep currency first so subtotal grouping works correctly.
         */
        let sortBy = '';

        if (!sortColumn || sortColumn === 'currency_header' || sortColumn === 'invoice_header') {
            if (sortColumn === 'currency_header') {
                sortBy = `t.currency_header ${safeSortOrder}, t.invoice_header ASC`;
            } else if (sortColumn === 'invoice_header') {
                sortBy = `t.currency_header ASC, t.invoice_header ${safeSortOrder}`;
            } else {
                sortBy = `t.currency_header ASC, t.invoice_header ASC`;
            }
        } else if (sortColumn === 'date_header') {
            sortBy = `t.currency_header ASC, t.invoice_date ${safeSortOrder}, t.invoice_header ASC`;
        } else if (sortColumn === 'supplier_header') {
            sortBy = `t.currency_header ASC, t.supplier_header ${safeSortOrder}, t.invoice_header ASC`;
        } else if (sortColumn === 'amount_header') {
            sortBy = `t.currency_header ASC, t.amount_value ${safeSortOrder}, t.invoice_header ASC`;
        } else {
            sortBy = `t.currency_header ASC, t.invoice_header ASC`;
        }

        parameters.push(startDate);
        parameters.push(endDate);

        let query = `
            SELECT
                t.invoice_header,
                DATE_FORMAT(t.invoice_date, '%d-%m-%Y') AS date_header,
                t.supplier_header,
                t.currency_header,
                FORMAT(t.amount_value, 0) AS amount_header,
                FORMAT(
                    IF(@currentGroup <> t.currency_header,
                        IF(@currentGroup := t.currency_header, @currentSum := 0, @currentSum := t.amount_value),
                        @currentSum := @currentSum + t.amount_value
                    ),
                    0
                ) AS subtotal_header
            FROM
            (
                SELECT
                    LTRIM(RTRIM(inv.cinvrefno)) AS invoice_header,
                    inv.dinvdate AS invoice_date,
                    IFNULL(LTRIM(RTRIM(ent.centdesc)), '') AS supplier_header,
                    exc.cexcdesc AS currency_header,
                    SUM(
                        (
                            IF(inv.cinvspecial = 'RB', -det.nIVDAmount, det.nIVDAmount)
                            * (1 - inv.nInvDisc1 / 100)
                            * (1 - inv.nInvDisc2 / 100)
                            * (1 - inv.nInvDisc3 / 100)
                            * (IF(det.nivdstkppn = 1, 1 + inv.ninvtax / 100, 1))
                        )
                    ) + IF(inv.cinvspecial = 'RB', -inv.ninvfreight, inv.ninvfreight) AS amount_value
                FROM invoice inv
                INNER JOIN invoicedetail det
                    ON inv.cinvpk = det.civdfkinv
                INNER JOIN exchange exc
                    ON inv.cinvfkexc = exc.cexcpk
                LEFT JOIN entity ent
                    ON inv.cinvfkent = ent.centpk
                WHERE inv.cinvspecial IN ('BL', 'RB', 'KS')
                  AND inv.dinvdate >= ?
                  AND inv.dinvdate <= ?
        `;

        if (decodedWarehouse) {
            query += ` AND inv.cinvfkwhs = ? `;
            parameters.push(decodedWarehouse);
        }

        query += `
                GROUP BY
                    inv.cinvrefno,
                    inv.dinvdate,
                    ent.centdesc,
                    exc.cexcdesc,
                    inv.nInvDisc1,
                    inv.nInvDisc2,
                    inv.nInvDisc3,
                    inv.ninvtax,
                    inv.ninvfreight,
                    inv.cinvspecial
            ) t
            CROSS JOIN (SELECT @currentGroup := '', @currentSum := 0) vars
            WHERE 1 = 1
        `;

        /**
         * Safe dynamic search
         */
        const filterColumns = columnsToFilter
            ? columnsToFilter
                  .toString()
                  .split(',')
                  .map(item => item.trim())
                  .filter(item => searchableColumnsMap[item])
            : [];

        if (searchValue && filterColumns.length > 0) {
            query += ` AND (`;
            query += filterColumns
                .map(column => `${searchableColumnsMap[column]} LIKE ?`)
                .join(' OR ');
            query += `)`;

            for (let i = 0; i < filterColumns.length; i++) {
                parameters.push(`%${searchValue}%`);
            }
        }

        query += ` ORDER BY ${sortBy}`;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Purchase_Report_No_Disc}`);
        console.log('warehouse: ', decodedWarehouse);
        console.log(`=============================================`);

        const response = await this.genericRepository.query<PurchasingReportNoDiscDTO>(query, parameters);

        if (response?.length) {
            return ResponseHelper.CreateResponse<PurchasingReportNoDiscDTO[]>(
                response,
                HttpStatus.OK,
                Constants.DATA_SUCCESS
            );
        } else {
            return ResponseHelper.CreateResponse<PurchasingReportNoDiscDTO[]>(
                [],
                HttpStatus.NOT_FOUND,
                Constants.DATA_NOT_FOUND
            );
        }
    }
}