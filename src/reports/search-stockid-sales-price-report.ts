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
export class SearchStockID_Sales_Price_Report implements ReportStrategy {
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

        const parameters = [decodeURIComponent(stockId)];

        const query = `
       SELECT 
        LTRIM(RTRIM(cSTDcode)) AS StockID,
        LTRIM(RTRIM(cSTKdesc)) AS StockName,
        LTRIM(RTRIM(warehouse.cwhsdesc)) AS Location,
        FORMAT(SUM(zQtyIn - zQtyOut), 0) AS Qty,
        FORMAT(sdt.nSTDprice, 0) AS Price,
        FORMAT(SUM(zQtyIn - zQtyOut) * sdt.nSTDprice, 0) AS Balance
      FROM (
        -- Invoiced Details
				   
						   
        SELECT cIvdFkStk, cInvFkWhs AS pkWhs,
										  
               SUM(nIVDzqtyIn) AS zQtyIn, SUM(nIVDzqtyOut) AS zQtyOut
        FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial NOT IN ('KS', '02') AND nIVDaccqty >= 0
        GROUP BY cIvdFkStk, cInvFkWhs

        UNION ALL

        -- Transfer Details
				  
						  
        SELECT cIvdFkStk, cInvTransfer AS pkWhs,
               SUM(nIVDzqtyOut) AS zQtyIn, SUM(nIVDzqtyIn) AS zQtyOut
										  
        FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial NOT IN ('KS', '02')
          AND cInvTransfer IS NOT NULL AND cInvTransfer <> 'n/a'
									   
          AND nIVDkirim = 1 AND nIVDaccqty >= 0
								 
        GROUP BY cIvdFkStk, cInvTransfer
      ) AS c
      INNER JOIN warehouse ON warehouse.cwhspk = c.pkWhs
      INNER JOIN stock ON cIvdFkStk = CSTKPK AND nstksuspend = 0 AND nstkservice = 0
      INNER JOIN stockdetail sdt ON cIvdFkStk = cSTDfkSTK AND nSTDfactor = 1 AND nstdkey = 1
      INNER JOIN unit ON cSTDfkUNI = cUNIpk
      WHERE cSTDcode = ?
      GROUP BY StockID, StockName, Location, sdt.nSTDretail
      ORDER BY Location ASC
    `;

    console.log(`query: ${query}`);
    console.log(`Report Name: ${ReportName.Stock_Balance_BarCode}`);
    console.log(`stockCode: ${parameters[0]}`);
    console.log('==================================================');

    const response = await this.genericRepository.query<StocBalancekDTO>(query, parameters);

    return response?.length
      ? ResponseHelper.CreateResponse<StocBalancekDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS)
						 
							  
									  
			  
				
      : ResponseHelper.CreateResponse<StocBalancekDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
				   
									 
										
			  
  }
	 
}