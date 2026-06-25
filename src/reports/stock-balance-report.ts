import { StocBalancekDTO } from './../dto/stock-balance.dto';
import { Injectable, HttpStatus } from '@nestjs/common';
import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class StockBalanceReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        const { stockGroup, warehouse, sortColumn, sortDirection, searchValue, columnsToFilter } = queryString;

        // Determine sort column and order
        const defaultSort = 'stock_name_header, stock_id_header, location_header';
        let sortBy: string;
        if (sortColumn && ['stock_name_header', 'stock_id_header', 'location_header'].includes(sortColumn)) {
            sortBy = sortColumn;
        } else if (sortColumn) {
            sortBy = `CAST(REPLACE(${sortColumn}, ',', '') AS SIGNED)`;
        } else {
            sortBy = defaultSort;
        }
        const sortOrder = sortDirection?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Prepare parameters
        const parameters: any[] = [];

        // Base query
        let query = `
            SELECT 
                Kode AS stock_id_header,
                Nama AS stock_name_header,
                Lokasi AS location_header,
                FORMAT(d.Qty, 0) AS qty_header,
                FORMAT(d.Price, 0) AS price_header,
                FORMAT(d.Balance, 0) AS balance_header,
                FORMAT(@totalBalance := @totalBalance + Balance, 0) AS total_balance_header
            FROM (
                SELECT 
                    TRIM(cSTDcode) AS Kode,
                    TRIM(cSTKdesc) AS Nama,
                    TRIM(warehouse.cwhsdesc) AS Lokasi,
                    SUM(zqtyin - zqtyout) AS Qty,
                    sdt.nSTDretail AS Price,
                    SUM(zqtyin - zqtyout) * sdt.nSTDretail AS Balance
                FROM (
                    SELECT cIvdFkStk, cInvFkWhs AS pkWhs,
                        SUM(nIVDzqtyIn) AS zQtyIn, 
                        SUM(nIVDzqtyOut) AS zQtyOut
                    FROM Invoicedetail
                    INNER JOIN Invoice ON cIVDfkINV = cINVpk
                    WHERE cinvspecial NOT IN ('KS', '02')
                        AND nIVDkirim = 1
                        AND nivdaccqty >= 0
                    GROUP BY cIvdFkStk, cInvFkWhs

                    UNION ALL

                    SELECT cIvdFkStk, cInvTransfer AS pkWhs,
                        SUM(nIVDzqtyOut) AS zQtyIn, 
                        SUM(nIVDzqtyIn) AS zQtyOut
                    FROM Invoicedetail
                    INNER JOIN Invoice ON cIVDfkINV = cINVpk
                    WHERE cinvspecial NOT IN ('KS', '02')
                        AND nIVDkirim = 1
                        AND nivdaccqty >= 0
                    GROUP BY cIvdFkStk, cInvTransfer
                ) AS c
                INNER JOIN warehouse ON warehouse.cwhspk = c.pkWhs
                INNER JOIN stock ON cIvdFkStk = CSTKPK AND nstksuspend = 0 AND nstkservice = 0
                INNER JOIN stockdetail sdt ON cIvdFkStk = cSTDfkSTK AND nSTDfactor = 1 AND nstdkey = 1
                INNER JOIN unit ON cSTDfkUNI = cUNIpk
                WHERE nstksuspend = 0
        `;

        // Dynamic search filters
        const filterColumns = columnsToFilter?.toString().split(',').map(c => c.trim()) || [];
        if (searchValue && filterColumns.length) {
            query += ' AND (' + filterColumns.map(c => `${c} LIKE ?`).join(' OR ') + ')';
            parameters.push(...filterColumns.map(() => `%${searchValue}%`));
        }

        // Warehouse filter
        if (warehouse) {
            query += ' AND cwhspk = ?';
            parameters.push(decodeURIComponent(warehouse));
        }

        // Stock group filter
        if (stockGroup) {
            query += ' AND cstkfkgrp = ?';
            parameters.push(decodeURIComponent(stockGroup));
        }

        // Group by
        query += `
                GROUP BY Kode, Nama, Lokasi
            ) d
            JOIN (SELECT @totalBalance := 0) r
            WHERE Qty <> 0
            ORDER BY ${sortBy} ${sortOrder};
        `;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Stock_Balance}`);
        console.log('warehouse: ', warehouse);
        console.log('stockGroup: ', stockGroup);
        console.log(`=================================================`);

        // Execute query
        const response = await this.genericRepository.query<StocBalancekDTO>(query, parameters);

        if (response?.length) {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}