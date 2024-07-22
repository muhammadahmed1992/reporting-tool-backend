import { StocBalancekDTO } from './../dto/stock-balance.dto';
import { Injectable, HttpStatus } from '@nestjs/common';

import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';

@Injectable()
export class StockBalanceReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(...params: any): Promise<ApiResponse<any>> {
        const [stockGroup, warehouse] = params;
        let query = `
        select cSTDcode as Kode,cSTKdesc as Nama,
        warehouse.cwhsdesc as Lokasi,
        sum(zqtyin-zqtyout) as Qty,sdt.nSTDprice as Price,
        sum(zqtyin-zqtyout)*nstdprice as Balance
        from
        (
        
        SELECT cIvdFkStk, cInvFkWhs as pkWhs,
        SUM(nIVDzqtyIn) as zQtyIn, SUM(nIVDzqtyout) as zQtyOut, 
        'a' as detailType FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial<>'KS'  
        and nIVDkirim=1
        and nivdaccqty>=0
        and cinvspecial<>'02'
        group by cIvdFkStk, cInvFkWhs 
        
        union 
        
        SELECT cIvdFkStk, cInvTransfer as pkWhs,
        SUM(nIVDzqtyOut) as zQtyIn,SUM(nIVDzqtyIn) as zQtyOut,
        't' as detailType FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial<>'KS'  
        and nIVDkirim=1
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
        INNER JOIN unit ON cSTDfkUNI=cUNIpk
        where 1=1 `
        if (warehouse) {
            query+= ` and (IFNULL(?, cwhspk) = cwhspk or cwhspk is null) `;
        }
        if (stockGroup) {
            query+= ` and (IFNULL(?, cstkfkgrp) = cstkfkgrp or cstkfkgrp is null) `;
        }
        
        query+= ` group by Kode,Nama,Lokasi 
        order by Lokasi,kode asc `;
        console.log(`Report Name: ${ReportName.Stock_Balance}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log('stockGroup: ', decodeURIComponent(stockGroup));
        console.log(`=================================================`);
        const parameters = [];
        if (warehouse)
            parameters.push(decodeURIComponent(warehouse));
        if (stockGroup)
            parameters.push(decodeURIComponent(stockGroup));
        const response = await this.genericRepository.query<StocBalancekDTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>(response, HttpStatus.OK, 'Data retrieved successfully.');
        } else {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>([], HttpStatus.NOT_FOUND, 'Data not found on these parameters.');
        }
    }
}