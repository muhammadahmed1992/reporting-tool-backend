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
export class StockBalanceReport_Purchase_Price implements ReportStrategy {
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
    d.Kode AS stock_id_header,
    d.Nama AS stock_name_header,
    d.Lokasi AS location_header,
    FORMAT(d.Qty, 0) AS qty_header,
    FORMAT(d.Price, 0) AS price_header,
    FORMAT(d.Balance, 0) AS balance_header,
    FORMAT(@totalBalance := @totalBalance + d.Balance, 0) AS total_balance_header
FROM
(
    SELECT
        TRIM(stockdetail.cSTDcode) AS Kode,
        TRIM(stock.cSTKdesc) AS Nama,
        TRIM(warehouse.cwhsdesc) AS Lokasi,
        SUM(c.zQtyIn - c.zQtyOut) AS Qty,
        stock.nstkbuy AS Price,
        SUM(c.zQtyIn - c.zQtyOut) * stock.nstkbuy AS Balance
    FROM
    (
        SELECT
            Invoicedetail.cIvdFkStk,
            Invoice.cInvFkWhs AS pkWhs,
            SUM(Invoicedetail.nIVDzqtyIn) AS zQtyIn,
            SUM(Invoicedetail.nIVDzqtyOut) AS zQtyOut
        FROM Invoicedetail
        INNER JOIN Invoice
            ON Invoicedetail.cIVDfkINV = Invoice.cINVpk
        WHERE Invoice.cinvspecial NOT IN ('KS', '02')
          AND Invoicedetail.nIVDkirim = 1
          AND Invoicedetail.nivdaccqty >= 0
        GROUP BY Invoicedetail.cIvdFkStk, Invoice.cInvFkWhs

        UNION ALL

        SELECT
            Invoicedetail.cIvdFkStk,
            Invoice.cInvTransfer AS pkWhs,
            SUM(Invoicedetail.nIVDzqtyOut) AS zQtyIn,
            SUM(Invoicedetail.nIVDzqtyIn) AS zQtyOut
        FROM Invoicedetail
        INNER JOIN Invoice
            ON Invoicedetail.cIVDfkINV = Invoice.cINVpk
        WHERE Invoice.cinvspecial NOT IN ('KS', '02')
          AND Invoicedetail.nIVDkirim = 1
          AND Invoicedetail.nivdaccqty >= 0
        GROUP BY Invoicedetail.cIvdFkStk, Invoice.cInvTransfer
    ) AS c
    INNER JOIN warehouse
        ON warehouse.cwhspk = c.pkWhs
    INNER JOIN stock
        ON stock.CSTKPK = c.cIvdFkStk
       AND stock.nstksuspend = 0
       AND stock.nstkservice = 0
    INNER JOIN stockdetail
        ON stockdetail.cSTDfkSTK = c.cIvdFkStk
       AND stockdetail.nSTDfactor = 1
       AND stockdetail.nstdkey = 1
    INNER JOIN unit
        ON unit.cUNIpk = stockdetail.cSTDfkUNI
    WHERE stock.nstksuspend = 0
    GROUP BY
        TRIM(stockdetail.cSTDcode),
        TRIM(stock.cSTKdesc),
        TRIM(warehouse.cwhsdesc),
        stockdetail.nstdprice
) AS d
JOIN (SELECT @totalBalance := 0) AS r
WHERE d.Qty <> 0
ORDER BY d.Nama, d.Kode, d.Lokasi ASC`;

    // Push parameters
    if (searchValue && columnsToFilter?.length) parameters.push(...columnsToFilter.map(() => `%${searchValue}%`));
    if (warehouse) parameters.push(decodeURIComponent(warehouse));
    if (stockGroup) parameters.push(decodeURIComponent(stockGroup));

    console.log(`query: ${query}`);
    console.log(`Report Name: ${ReportName.Stock_Balance_Report_Purchase_Price}`);
    console.log('warehouse: ', warehouse);
    console.log('stockGroup: ', stockGroup);
    console.log(`=================================================`);




    const response = await this.genericRepository.query<StocBalancekDTO>(query, parameters);

    return response?.length
      ? ResponseHelper.CreateResponse<StocBalancekDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS)
      : ResponseHelper.CreateResponse<StocBalancekDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
  }
}