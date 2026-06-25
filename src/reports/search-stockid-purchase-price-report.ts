import { Injectable, HttpStatus } from '@nestjs/common';

import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository';

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { StocBalancekDTO } from 'src/dto/stock-balance.dto';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class SearchStockID_Purchase_Price_Report implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        const { stockId } = queryString;

        if (!stockId) {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>(
                [],
                HttpStatus.NOT_FOUND,
                Constants.STOCK_CODE_EMPTY
            );
        }

        const decodedStockId = decodeURIComponent(stockId);
        const parameters: any[] = [decodedStockId];

        const query = `
            SELECT
                LTRIM(RTRIM(sdt.cSTDcode)) AS StockID,
                LTRIM(RTRIM(stk.cSTKdesc)) AS StockName,
                LTRIM(RTRIM(wh.cwhsdesc)) AS Location,
                FORMAT(SUM(mv.zQtyIn - mv.zQtyOut), 0) AS Qty,
                FORMAT(stk.nstkbuy, 0) AS Price,
                FORMAT(SUM(mv.zQtyIn - mv.zQtyOut) * stk.nstkbuy, 0) AS Balance
            FROM
            (
                SELECT
                    d.cIvdFkStk AS cIvdFkStk,
                    i.cInvFkWhs AS pkWhs,
                    SUM(d.nIVDzqtyIn) AS zQtyIn,
                    SUM(d.nIVDzqtyOut) AS zQtyOut
                FROM Invoicedetail d
                INNER JOIN Invoice i
                    ON i.cINVpk = d.cIVDfkINV
                WHERE i.cinvspecial <> 'KS'
                  AND i.cinvspecial <> '02'
                  AND d.nivdaccqty >= 0
                GROUP BY d.cIvdFkStk, i.cInvFkWhs

                UNION ALL

                SELECT
                    d.cIvdFkStk AS cIvdFkStk,
                    i.cInvTransfer AS pkWhs,
                    SUM(d.nIVDzqtyOut) AS zQtyIn,
                    SUM(d.nIVDzqtyIn) AS zQtyOut
                FROM Invoicedetail d
                INNER JOIN Invoice i
                    ON i.cINVpk = d.cIVDfkINV
                WHERE i.cinvspecial <> 'KS'
                  AND i.cinvspecial <> '02'
                  AND d.nivdaccqty >= 0
                  AND d.nIVDkirim = 1
                  AND i.cInvTransfer IS NOT NULL
                  AND i.cInvTransfer <> 'n/a'
                GROUP BY d.cIvdFkStk, i.cInvTransfer
            ) mv
            INNER JOIN warehouse wh
                ON wh.cwhspk = mv.pkWhs
            INNER JOIN stock stk
                ON stk.cSTKPK = mv.cIvdFkStk
               AND stk.nstksuspend = 0
               AND stk.nstkservice = 0
            INNER JOIN stockdetail sdt
                ON sdt.cSTDfkSTK = mv.cIvdFkStk
               AND sdt.nSTDfactor = 1
               AND sdt.nstdkey = 1
            WHERE sdt.cSTDcode = ?
            GROUP BY
                sdt.cSTDcode,
                stk.cSTKdesc,
                wh.cwhsdesc,
                stk.nstkbuy
            ORDER BY wh.cwhsdesc ASC
        `;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Stock_Balance_BarCode}`);
        console.log(`stockCode ${decodedStockId}`);
        console.log(`==================================================`);

        const response = await this.genericRepository.query<StocBalancekDTO>(query, parameters);

        if (response?.length) {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>(
                response,
                HttpStatus.OK,
                Constants.DATA_SUCCESS
            );
        }

        return ResponseHelper.CreateResponse<StocBalancekDTO[]>(
            [],
            HttpStatus.NOT_FOUND,
            Constants.DATA_NOT_FOUND
        );
    }
}