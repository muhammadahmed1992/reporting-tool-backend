import { Injectable, HttpStatus } from '@nestjs/common';
import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { PurchasingDTO } from 'src/dto/purchasing-report.dto';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class PurchaseReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        const startDate = typeof queryString.startDate === 'string' ? queryString.startDate : '';
        const endDate = typeof queryString.endDate === 'string' ? queryString.endDate : '';
        const warehouse = typeof queryString.warehouse === 'string' ? queryString.warehouse : '';
        const sortColumn = typeof queryString.sortColumn === 'string' ? queryString.sortColumn : '';
        const sortDirection = typeof queryString.sortDirection === 'string' ? queryString.sortDirection : 'ASC';
        const searchValue = typeof queryString.searchValue === 'string' ? queryString.searchValue : '';

        const parameters: any[] = [];
        const sortOrder = sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const allowedFilterColumns: { [key: string]: string } = {
            invoice_header: 'cinvrefno',
            date_header: "DATE_FORMAT(dinvdate, '%d-%m-%Y')",
            customer_header: 'centdesc',
            currency_header: 'cexcdesc'
        };

        const allowedSortColumns: { [key: string]: string } = {
            invoice_header: 'invoice_header',
            date_header: "STR_TO_DATE(date_header, '%d-%m-%Y')",
            supplier_header: 'supplier_header',
            currency_header: 'currency_header',
            amount_header: 'Amount'
        };

        let sortBy = '';

        if (!sortColumn || sortColumn === 'currency_header' || sortColumn === 'invoice_header') {
            if (sortColumn === 'currency_header') {
                sortBy = `currency_header ${sortOrder}, invoice_header ASC`;
            } else {
                sortBy = `currency_header ASC, invoice_header ${sortOrder}`;
            }
        } else if (sortColumn === 'date_header') {
            sortBy = `currency_header ASC, ${allowedSortColumns.date_header} ${sortOrder}, invoice_header ASC`;
        } else if (allowedSortColumns[sortColumn]) {
            sortBy = `currency_header ASC, ${allowedSortColumns[sortColumn]} ${sortOrder}, invoice_header ASC`;
        } else {
            sortBy = `currency_header ASC, invoice_header ASC`;
        }

        parameters.push(startDate);
        parameters.push(endDate);

        let query = `
        SELECT
            Invoice AS invoice_header,
            Date AS date_header,
            IFNULL(Customer, '') AS supplier_header,
            Currency AS currency_header,
            FORMAT(Amount, 0) AS amount_header,
            FORMAT(
                IF(
                    @currentGroup <> Currency,
                    IF(@currentGroup := Currency, @currentSum := 0, @currentSum := Amount),
                    @currentSum := @currentSum + Amount
                ),
                0
            ) AS subtotal_header
        FROM (
            SELECT
                a.civdfkinv,
                LTRIM(RTRIM(cinvrefno)) AS Invoice,
                DATE_FORMAT(dinvdate, '%d-%m-%Y') AS Date,
                LTRIM(RTRIM(centdesc)) AS Customer,
                LTRIM(RTRIM(cexcdesc)) AS Currency,
                SUM((sumdetails - ndisc / rows2) * (IF(nivdstkppn = 1, 1 + ninvtax / 100, 1))) + nfreight AS Amount
            FROM (
                SELECT
                    civdfkinv,
                    COUNT(1) AS rows2
                FROM invoicedetail
                INNER JOIN invoice
                    ON civdfkinv = cinvpk
                WHERE dinvdate >= ?
                  AND dinvdate <= ?
        `;

        let filterColumns: string[] = [];
        const columnsToFilterValue = queryString.columnsToFilter as unknown;

        if (Array.isArray(columnsToFilterValue)) {
            filterColumns = columnsToFilterValue
                .map((item) => String(item).trim())
                .filter((item) => !!allowedFilterColumns[item]);
        } else if (columnsToFilterValue != null) {
            filterColumns = String(columnsToFilterValue)
                .split(',')
                .map((item) => item.trim())
                .filter((item) => !!allowedFilterColumns[item]);
        }

        if (searchValue && filterColumns.length > 0) {
            query += ' AND (';
            query += filterColumns
                .map((column) => `${allowedFilterColumns[column]} LIKE ?`)
                .join(' OR ');
            query += ')';

            for (let i = 0; i < filterColumns.length; i++) {
                parameters.push(`%${searchValue}%`);
            }
        }
        if (warehouse) {
            query += ` AND (cinvfkwhs = ? OR cinvfkwhs IS NULL) `;
            parameters.push(decodeURIComponent(warehouse));
        }

        query += `
                GROUP BY civdfkinv
            ) AS a
            INNER JOIN (
                SELECT
                    civdfkstk,
                    civdfkinv,
                    ninvdisc,
                    nivdstkppn,
                    ninvtax,
                    cinvrefno,
                    dinvdate,
                    centdesc,
                    cexcdesc,
                    IF(cinvspecial = 'RB', -nIVDAmount, nIVDAmount)
                        * (1 - nInvDisc1 / 100)
                        * (1 - nInvDisc2 / 100)
                        * (1 - nInvDisc3 / 100) AS sumdetails,
                    IF(cinvspecial = 'RB', -nINVfreight, nINVfreight) AS nfreight,
                    IF(cinvspecial = 'RB', -nINVdisc, nINVdisc) AS ndisc
                FROM invoice
                INNER JOIN invoicedetail
                    ON cinvpk = civdfkinv
                INNER JOIN exchange
                    ON cinvfkexc = cexcpk
                LEFT JOIN entity
                    ON cinvfkent = centpk
                WHERE cinvspecial IN ('BL', 'RB', 'KS')
            ) AS b
                ON a.civdfkinv = b.civdfkinv
            GROUP BY
                a.civdfkinv,
                cinvrefno,
                dinvdate,
                centdesc,
                cexcdesc,
                nfreight
        ) AS a,
        (SELECT @currentGroup := '', @currentSum := 0) r
        ORDER BY ${sortBy}
        `;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Sales}`);
        console.log('warehouse: ', warehouse ? decodeURIComponent(warehouse) : '');
        console.log('==================================================');
        console.log({ queryString });

        const response = await this.genericRepository.query<PurchasingDTO>(query, parameters);

        if (response?.length) {
            return ResponseHelper.CreateResponse<PurchasingDTO[]>(
                response,
                HttpStatus.OK,
                Constants.DATA_SUCCESS
            );
        } else {
            return ResponseHelper.CreateResponse<PurchasingDTO[]>(
                [],
                HttpStatus.NOT_FOUND,
                Constants.DATA_NOT_FOUND
            );
        }
    }
}