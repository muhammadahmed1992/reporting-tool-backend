import { Injectable, HttpStatus } from '@nestjs/common';
import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository';
import { Sales2DTO } from './../dto/sales-2.dto';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class Sales2Report implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        const {
            startDate,
            endDate,
            warehouse,
            sortColumn,
            sortDirection,
            searchValue,
            columnsToFilter,
        } = queryString;

        const parameters: any[] = [];
        const decodedWarehouse = warehouse ? decodeURIComponent(warehouse) : null;
        const sortOrder = (sortDirection && sortDirection.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

        /**
         * Only allow sorting by known output aliases to avoid SQL injection.
         * Never inject raw client input into ORDER BY.
         */
        const allowedSortColumns: Record<string, string> = {
            invoice_header: 'Invoice',
            date_header: 'InvoiceDate',
            customer_header: 'Customer',
            currency_header: 'Currency',
            amount_header: 'Amount',
            subtotal_header: 'SubtotalAmount',
        };

        let sortBy = 'Currency ASC, Invoice ASC';

        if (!sortColumn || sortColumn === 'invoice_header') {
            sortBy = `Currency ASC, Invoice ${sortOrder}`;
        } else if (sortColumn === 'currency_header') {
            sortBy = `Currency ${sortOrder}, Invoice ASC`;
        } else if (sortColumn === 'date_header') {
            sortBy = `Currency ASC, InvoiceDate ${sortOrder}, Invoice ASC`;
        } else if (sortColumn === 'customer_header') {
            sortBy = `Currency ASC, Customer ${sortOrder}, Invoice ASC`;
        } else if (sortColumn === 'amount_header' || sortColumn === 'subtotal_header') {
            sortBy = `Currency ASC, Amount ${sortOrder}, Invoice ASC`;
        }

        /**
         * Only allow filtering on safe projected columns from the derived table.
         * This avoids raw column injection from columnsToFilter.
         */
        const allowedFilterColumns: Record<string, string> = {
            invoice_header: 't.Invoice',
            date_header: "DATE_FORMAT(t.InvoiceDate, '%d-%m-%Y')",
            customer_header: 't.Customer',
            currency_header: 't.Currency',
        };

        const requestedFilterColumns = columnsToFilter
            ? columnsToFilter
                  .toString()
                  .split(',')
                  .map(item => item.trim())
                  .filter(item => allowedFilterColumns[item])
            : [];

        let query = `
            SELECT
                x.Invoice AS invoice_header,
                DATE_FORMAT(x.InvoiceDate, '%d-%m-%Y') AS date_header,
                IFNULL(x.Customer, '') AS customer_header,
                x.Currency AS currency_header,
                FORMAT(x.Amount, 0) AS amount_header,
                FORMAT(
                    IF(
                        @currentGroup <> x.Currency,
                        IF(@currentGroup := x.Currency, @currentSum := x.Amount, @currentSum := x.Amount),
                        @currentSum := @currentSum + x.Amount
                    ),
                    0
                ) AS subtotal_header
            FROM
            (
                SELECT
                    LTRIM(RTRIM(i.cinvrefno)) AS Invoice,
                    i.dinvdate AS InvoiceDate,
                    LTRIM(RTRIM(e.centdesc)) AS Customer,
                    ex.cexcdesc AS Currency,
                    SUM(
                        (
                            IF(i.cinvspecial IN ('RJ', 'RS'), -id.nIVDAmount, id.nIVDAmount)
                            * (1 - i.nInvDisc1 / 100)
                            * (1 - i.nInvDisc2 / 100)
                            * (1 - i.nInvDisc3 / 100)
                            * (IF(id.nivdstkppn = 1, 1 + i.ninvtax / 100, 1))
                        )
                    ) + MAX(
                        IF(i.cinvspecial IN ('RJ', 'RS'), -i.ninvfreight, i.ninvfreight)
                    ) AS Amount
                FROM invoice i
                INNER JOIN invoicedetail id ON i.cinvpk = id.civdfkinv
                INNER JOIN exchange ex ON i.cinvfkexc = ex.cexcpk
                LEFT JOIN entity e ON i.cinvfkent = e.centpk
                WHERE i.cinvspecial IN ('JL', 'RJ', 'PS', 'RS')
                  AND i.dinvdate >= ?
                  AND i.dinvdate < DATE_ADD(?, INTERVAL 1 DAY)
        `;

        parameters.push(startDate);
        parameters.push(endDate);

        /**
         * Better than:
         * and (IFNULL(?, cinvfkwhs) = cinvfkwhs or cinvfkwhs is null)
         *
         * That old pattern prevents index usage.
         */
        if (decodedWarehouse) {
            query += ` AND (i.cinvfkwhs = ? OR i.cinvfkwhs IS NULL) `;
            parameters.push(decodedWarehouse);
        }

        query += `
                GROUP BY
                    i.cinvrefno,
                    i.dinvdate,
                    e.centdesc,
                    ex.cexcdesc,
                    i.cinvspecial,
                    i.nInvDisc1,
                    i.nInvDisc2,
                    i.nInvDisc3,
                    i.ninvtax
            ) x
            CROSS JOIN (SELECT @currentGroup := '', @currentSum := 0) vars
            WHERE 1 = 1
        `;

        if (searchValue && requestedFilterColumns.length > 0) {
            query += ' AND (';
            query += requestedFilterColumns
                .map(col => `${allowedFilterColumns[col]} LIKE ?`)
                .join(' OR ');
            query += ')';

            for (let i = 0; i < requestedFilterColumns.length; i++) {
                parameters.push(`%${searchValue}%`);
            }
        }

        query += ` ORDER BY ${sortBy}`;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Sales_No_Disc}`);
        console.log('warehouse: ', decodedWarehouse);
        console.log(`=============================================`);

        const response = await this.genericRepository.query<Sales2DTO>(query, parameters);

        if (response?.length) {
            return ResponseHelper.CreateResponse<Sales2DTO[]>(
                response,
                HttpStatus.OK,
                Constants.DATA_SUCCESS
            );
        } else {
            return ResponseHelper.CreateResponse<Sales2DTO[]>(
                [],
                HttpStatus.NOT_FOUND,
                Constants.DATA_NOT_FOUND
            );
        }
    }
}