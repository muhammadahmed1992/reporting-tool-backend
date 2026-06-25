import { StocBalancekDTO } from '../dto/stock-balance.dto';
import { Injectable, HttpStatus } from '@nestjs/common';
import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class StockBalanceReport_Sales_Price implements ReportStrategy {
  constructor(private readonly genericRepository: GenericRepository) {}

  public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
    const { stockGroup, warehouse, sortColumn, sortDirection, searchValue, columnsToFilter } = queryString;

    // Simplified sort logic
    const validSortColumns = ['stock_name_header', 'stock_id_header', 'location_header'];
    const sortBy = validSortColumns.includes(sortColumn) ? sortColumn : sortColumn ? `CAST(REPLACE(${sortColumn}, ',', '') AS SIGNED)` : 'stock_name_header,stock_id_header,location_header';
    const sortOrder = sortDirection || 'ASC';

    const parameters: any[] = [];

    let query = `
      SELECT 
        TRIM(cSTDcode) AS stock_id_header,
        TRIM(cSTKdesc) AS stock_name_header,
        TRIM(warehouse.cwhsdesc) AS location_header,
        FORMAT(d.Qty, 0) AS qty_header,
        FORMAT(d.Price, 0) AS price_header,
        FORMAT(d.Balance, 0) AS balance_header,
        FORMAT(@totalBalance := @totalBalance + Balance, 0) AS total_balance_header
      FROM (
        SELECT 
          cIvdFkStk,
          SUM(zQtyIn - zQtyOut) AS Qty,
          nstdprice AS Price,
          SUM(zQtyIn - zQtyOut) * nstdprice AS Balance,
          LTRIM(RTRIM(cSTDcode)) AS Kode,
          LTRIM(RTRIM(cSTKdesc)) AS Nama,
          TRIM(warehouse.cwhsdesc) AS Lokasi
        FROM (
          SELECT 
            cIvdFkStk,
            cInvFkWhs AS pkWhs,
            SUM(nIVDzqtyIn) AS zQtyIn,
            SUM(nIVDzqtyOut) AS zQtyOut
          FROM Invoicedetail
          INNER JOIN Invoice ON cIVDfkINV = cINVpk
          WHERE cinvspecial NOT IN ('KS','02') AND nIVDkirim=1 AND nivdaccqty>=0
          GROUP BY cIvdFkStk, cInvFkWhs

          UNION ALL

          SELECT 
            cIvdFkStk,
            cInvTransfer AS pkWhs,
            SUM(nIVDzqtyOut) AS zQtyIn,
            SUM(nIVDzqtyIn) AS zQtyOut
          FROM Invoicedetail
          INNER JOIN Invoice ON cIVDfkINV = cINVpk
          WHERE cinvspecial NOT IN ('KS','02') AND nIVDkirim=1 AND nivdaccqty>=0
          GROUP BY cIvdFkStk, cInvTransfer
        ) AS c
        INNER JOIN warehouse ON warehouse.cwhspk = c.pkWhs
        INNER JOIN stock ON cIvdFkStk = CSTKPK AND nstksuspend=0 AND nstkservice=0
        INNER JOIN stockdetail sdt ON cIvdFkStk = cSTDfkSTK AND nSTDfactor=1 AND nstdkey=1
        INNER JOIN unit ON cSTDfkUNI = cUNIpk
        WHERE nstksuspend=0
        ${searchValue && columnsToFilter?.length ? `AND (${columnsToFilter.map(c => `${c} LIKE ?`).join(' OR ')})` : ''}
        ${warehouse ? 'AND (IFNULL(?, cwhspk) = cwhspk OR cwhspk IS NULL)' : ''}
        ${stockGroup ? 'AND (IFNULL(?, cstkfkgrp) = cstkfkgrp OR cstkfkgrp IS NULL)' : ''}
        GROUP BY Kode, Nama, Lokasi
      ) d
      JOIN (SELECT @totalBalance := 0) r
      WHERE Qty <> 0
      ORDER BY ${sortBy} ${sortOrder};
    `;

    // Push parameters
    if (searchValue && columnsToFilter?.length) parameters.push(...columnsToFilter.map(() => `%${searchValue}%`));
    if (warehouse) parameters.push(decodeURIComponent(warehouse));
    if (stockGroup) parameters.push(decodeURIComponent(stockGroup));

    console.log(`query: ${query}`);
    console.log(`Report Name: ${ReportName.Stock_Balance_Report_Sales_Price}`);
    console.log('warehouse: ', warehouse);
    console.log('stockGroup: ', stockGroup);
    console.log(`=================================================`);

    const response = await this.genericRepository.query<StocBalancekDTO>(query, parameters);

    return response?.length
      ? ResponseHelper.CreateResponse<StocBalancekDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS)
      : ResponseHelper.CreateResponse<StocBalancekDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
  }
}