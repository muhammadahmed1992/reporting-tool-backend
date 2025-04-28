import { Injectable, HttpStatus } from '@nestjs/common';


import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { PriceListDTO } from 'src/dto/price-list.dto';
import { StocBalancekDTO } from 'src/dto/stock-balance.dto';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';
@Injectable()
export class SearchStockID_Purchase_Price_Report implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        const {stockId} = queryString;
        if (!stockId) {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>([], HttpStatus.NOT_FOUND, Constants.STOCK_CODE_EMPTY);
        }
        const parameters = [];
        let query = `
        select LTRIM(RTRIM(cSTDcode)) as StockID,
        LTRIM(RTRIM(cSTKdesc)) as StockName,
        LTRIM(RTRIM(warehouse.cwhsdesc)) as Location,
        FORMAT(sum(zqtyin-zqtyout),0) as Qty,
        FORMAT(SUM(nstkbuy),0) as Price,
        FORMAT(sum(zqtyin-zqtyout)*nstkbuy,0) as Balance
        from
        (
        
        SELECT cIvdFkStk, cInvFkWhs as pkWhs,
        SUM(nIVDzqtyIn) as zQtyIn, SUM(nIVDzqtyout) as zQtyOut, 
        'a' as detailType FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial<>'KS' 
        and nivdaccqty>=0
        and cinvspecial<>'02' 
        group by cIvdFkStk, cInvFkWhs 
        
        union 
        
        SELECT cIvdFkStk, cInvTransfer as pkWhs,
        SUM(nIVDzqtyOut) as zQtyIn,
        SUM(nIVDzqtyIn) as zQtyOut, 
        't' as detailType FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial<>'KS'  
        and cInvTransfer <> 'n/a'
        and nIVDkirim=1 and cInvTransfer is not null
        and nivdaccqty>=0
        and cinvspecial<>'02'
        group by cIvdFkStk, cInvTransfer 
        
        ) as c
        
        inner join warehouse 
        on warehouse.cwhspk=c.pkwhs
        INNER JOIN stock 
        on cIvdFkStk=CSTKPK and nstksuspend=0 and nstkservice=0
        INNER JOIN stockdetail sdt 
        on cIvdFkStk=cSTDfkSTK And nSTDfactor=1 and nstdkey=1 
        INNER JOIN unit ON cSTDfkUNI=cUNIpk `
        
        if (stockId) {
            query+= ` where cstdcode=? `
            parameters.push(decodeURIComponent(stockId));
        }
        
        query+= `group by StockId,StockName,Location
        order by Location asc`

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Stock_Balance_BarCode}`);
        console.log(`stockCode ${decodeURIComponent(stockId)}`);
        console.log(`==================================================`);
        const response = await this.genericRepository.query<StocBalancekDTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}