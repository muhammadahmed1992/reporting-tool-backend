import { Injectable, HttpStatus } from '@nestjs/common';
import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { PriceListDTO } from 'src/dto/price-list.dto';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class PriceListReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        const { stockGroup, pageSize, pageNumber, searchValue, columnsToFilter, sortColumn, sortDirection } = queryString;

        console.log({ searchValue, columnsToFilter });

        const filterColumns = columnsToFilter ? columnsToFilter.toString().split(',').map(item => item.trim()) : [];
        console.log({ filterColumns });

        const parameters = [];
        const countParameters = [];

        // Build the count query
        let count = `
            SELECT COUNT(1) as total_rows
            FROM Stock
            INNER JOIN Stockdetail ON Stock.cSTKpk = Stockdetail.cSTDfkSTK
            INNER JOIN Unit ON Stockdetail.cSTDfkUNI = Unit.cUNIpk
            INNER JOIN stockgroup ON cstkfkgrp = cgrppk
            WHERE 1=1`;

        if (searchValue) {
            count += ' AND (';
            count += filterColumns.map(column => `${column} LIKE ?`).join(' OR ');
            count += ')';
            countParameters.push(...filterColumns.map(() => `%${searchValue}%`));
        }

        if (stockGroup) {
            count += ' AND (IFNULL(?, cstkfkgrp) = cstkfkgrp OR cstkfkgrp IS NULL)';
            countParameters.push(decodeURIComponent(stockGroup));
        }

        console.log('count query:', count);
        console.log('======================================');

        // Build the main query
        let query = `
            SELECT cSTDcode AS stock_id_header,
                   LTRIM(RTRIM(cSTKdesc)) AS stock_name_header,
                   FORMAT(nSTDprice, 0) AS price_header,
                   LTRIM(RTRIM(cUNIdesc)) AS unit_header
            FROM Stock
            INNER JOIN Stockdetail ON Stock.cSTKpk = Stockdetail.cSTDfkSTK
            INNER JOIN Unit ON Stockdetail.cSTDfkUNI = Unit.cUNIpk
            INNER JOIN stockgroup ON cstkfkgrp = cgrppk
            WHERE 1=1`;

        if (searchValue) {
            query += ' AND (';
            query += filterColumns.map(column => `${column} LIKE ?`).join(' OR ');
            query += ')';
            parameters.push(...filterColumns.map(() => `%${searchValue}%`));
        }

        if (stockGroup) {
            query += ' AND (IFNULL(?, cstkfkgrp) = cstkfkgrp OR cstkfkgrp IS NULL)';
            parameters.push(decodeURIComponent(stockGroup));
        }

        // Handle sorting// List of allowed columns to sort by
        console.log({sortDirection});
        const sortBy = sortColumn ? sortColumn : 'cSTDcode';  // Default to 'cSTDcode' if invalid column
        const sortOrder = sortDirection ? sortDirection : 'ASC';  // Default to 'ASC'

        query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;

        const offset = (pageNumber - 1) * pageSize;
        parameters.push(pageSize);
        parameters.push(offset);

        console.log(`offset: ${offset}, pageNumber: ${pageNumber}, pageSize: ${pageSize}`);
        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Price_List}`);
        console.log('parameters:', { stockGroup: decodeURIComponent(stockGroup), sortBy, sortOrder });
        console.log('=====================================');

        // Execute the queries
        const [response, totalRows] = await Promise.all([
            this.genericRepository.query<PriceListDTO>(query, parameters),
            this.genericRepository.query<number>(count, countParameters)
        ]);

        const totalPages = Math.ceil((totalRows[0] as any).total_rows / pageSize);

        if (response?.length) {
            return ResponseHelper.CreateResponse<PriceListDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS, {
                paging: {
                    totalPages
                }
            });
        } else {
            return ResponseHelper.CreateResponse<PriceListDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND, {
                paging: {
                    totalPages: 1
                }
            });
        }
    }
}
