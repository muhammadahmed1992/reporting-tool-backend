import { StocBalancekDTO } from './../dto/stock-balance.dto';
import { Injectable, HttpStatus } from '@nestjs/common';

import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class StockBalanceReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        const {stockGroup, warehouse, sortColumn, sortDirection, searchValue, columnsToFilter } = queryString;
        const sortBy = sortColumn ? sortColumn : 'stock_name_header,stock_id_header,location_header';  
        const sortOrder = sortDirection ? sortDirection : 'ASC'; 
        const parameters = [];
        let query = `
        select
        Kode as stock_id_header, Nama as stock_name_header, Lokasi as location_header,
                FORMAT(d.Qty, 0) as qty_header,
                Format(d.Price, 0) as price_header,
                Format(d.Balance, 0) as balance_header,
        Format(@totalBalance:= @totalBalance + Balance, 0) AS total_balance_header
        from (

        select LTRIM(RTRIM(cSTDcode)) as Kode,LTRIM(RTRIM(cSTKdesc)) as Nama,
        LTRIM(RTRIM(warehouse.cwhsdesc)) as Lokasi,
        SUM(zqtyin - zqtyout) as Qty,
        (sdt.nSTDprice) as Price,
        SUM(zqtyin - zqtyout) * (sdt.nSTDprice) as Balance
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
        where 1=1 `;
        const filterColumns = columnsToFilter ? columnsToFilter.toString().split(',').map(item => item.trim()) : [];
        if (searchValue) {
            query += ' AND (';
            query += filterColumns.map(column => `${column} LIKE ?`).join(' OR ');
            query += ')';
            parameters.push(...filterColumns.map(() => `%${searchValue}%`));
        }
        if (warehouse) {
            query+= ` and (IFNULL(?, cwhspk) = cwhspk or cwhspk is null) `;
        }
        if (stockGroup) {
            query+= ` and (IFNULL(?, cstkfkgrp) = cstkfkgrp or cstkfkgrp is null) `;
        }
        
        query+= ` group by Kode,Nama,Lokasi
         ) d
        JOIN (SELECT @totalBalance := 0) r
        order by ${sortBy} ${sortOrder}`;
        console.log(`query: ${query} `);
        console.log(`Report Name: ${ReportName.Stock_Balance}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log('stockGroup: ', decodeURIComponent(stockGroup));
        console.log(`=================================================`);
        
        if (warehouse)
            parameters.push(decodeURIComponent(warehouse));
        if (stockGroup)
            parameters.push(decodeURIComponent(stockGroup));
        const response = await this.genericRepository.query<StocBalancekDTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<StocBalancekDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}