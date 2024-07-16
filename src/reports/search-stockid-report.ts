import { Injectable, HttpStatus } from '@nestjs/common';


import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { PriceListDTO } from 'src/dto/price-list.dto';
import { StocBalancekDTO } from 'src/dto/stock-balance.dto';

@Injectable()
export class SearchStockIDReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(...params: any): Promise<ApiResponse<any>> {
        const [stockCode] = params;
        const parameters = [];
        let query = `
        select cSTDcode as StockID,cSTKdesc as StockName,
        cwhsdesc as Location,
        sum(zqtyin-zqtyout) as Qty,sdt.nSTDprice as Price,
        sum(zqtyin-zqtyout)*nstdprice as Balance
        from
        (
        SELECT cIvdFkStk, cInvFkWhs as pkWhs,
        SUM(nIVDzqtyIn) as zQtyIn, SUM(nIVDzqtyout) as zQtyOut,cIVDcode,
        'a' as detailType FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial<>'KS'
        and nIVDkirim=1 and cInvFkWhs is not null
        group by cIvdFkStk, cInvFkWhs
        union
        SELECT cIvdFkStk, cInvTransfer as pkWhs,
        SUM(nIVDzqtyOut) as zQtyIn,
        SUM(nIVDzqtyIn) as zQtyOut,cIVDcode,
        't' as detailType FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial<>'KS'
        and cInvTransfer <> 'n/a'
        and nIVDkirim=1 and cInvTransfer is not null
        group by cIvdFkStk, cInvTransfer
        ) as c
        inner join warehouse
        on warehouse.cwhspk=c.pkwhs
        INNER JOIN stock
        on cIvdFkStk=CSTKPK and nstksuspend=0 and nstkservice=0
        INNER JOIN stockdetail sdt
        on cIvdFkStk=cSTDfkSTK And nSTDfactor=1 and nstdkey=1
        INNER JOIN unit ON cSTDfkUNI=cUNIpk `
        if (stockCode) {
            query+= ` where (IFNULL(?, cstdcode) = cstdcode or cstdcode is null) `
            parameters.push(decodeURIComponent(stockCode));
        }
        query+= ` group by cIvdFkStk,Location `;
        console.log(`stockCode ${decodeURIComponent(stockCode)}`);
        
        const response = await this.genericRepository.query<StocBalancekDTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>(response, HttpStatus.OK, 'Data retrieved successfully.');
        } else {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>([], HttpStatus.NOT_FOUND, 'Data not found on these parameters.');
        }
    }
}