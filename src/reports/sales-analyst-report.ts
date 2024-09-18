import { Injectable, HttpStatus } from '@nestjs/common';

import { GenericRepository } from '../repository/generic.repository'

import { ReportStrategy } from '../interfaces-strategy/report-strategy';

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';

import { SalesAnalystDTO } from '../dto/sales-analyst.dto';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';
@Injectable()
export class SalesAnalystReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {

        let {startDate, endDate, warehouse, stockGroup, sortColumn, sortDirection, searchValue, columnsToFilter } = queryString;
        const sortBy = sortColumn ? sortColumn : 'stock_id_header, stock_name_header';  
        const sortOrder = sortDirection ? sortDirection : 'ASC';
 
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
        
        const parameters = [];
        parameters.push(startDate);
        parameters.push(endDate);
        let query = 
        `
        SELECT StockID as stock_id_header, StockName as stock_name_header, FORMAT(Qty,0) as qty_header, Currency as currency_header, FORMAT(Amount, 0) as amount_header, FORMAT(Amount_Tax, 0) as amount_tax_header,
            FORMAT(IF(@currentGroup <> Currency, 
                IF(@currentGroup:= Currency, @currentSum:= 0, @currentSum:= Amount), 
                @currentSum:= @currentSum + Amount
            ),0) AS subtotal_header,
            FORMAT(IF(@currentGroupAmountTax <> Currency, 
                IF(@currentGroupAmountTax:= Currency, @currentSumAmountTax:= 0, @currentSumAmountTax:= Amount_Tax), 
                @currentSumAmountTax:= @currentSumAmountTax + Amount_Tax
            ),0) AS amount_tax_total_header   
        FROM (
        select 
        cstdcode as StockID,
        LTRIM(RTRIM(cstkdesc)) as StockName,
        sum(tqty) as Qty,
        cexcdesc as Currency,
        sum(semua-if(cinvspecial='RJ' or cinvspecial='RS',-ninvdisc,ninvdisc)/rows2) as Amount,
        sum((semua-if(cinvspecial='RJ' or cinvspecial='RS',-ninvdisc,ninvdisc)/rows2)*(1+if(nivdstkppn=1,ninvtax/100,0))) as Amount_Tax
        
        from
        
        (SELECT civdfkinv,count(1) as rows2 FROM invoicedetail
            INNER JOIN invoice on cinvpk=civdfkinv
            WHERE nIVDkirim=1 GROUP BY civdfkinv
        ) as a
        inner join
        (SELECT nstkppn,cinvspecial,civdfkinv,cstdcode, cstkdesc, cexcdesc,ninvdisc,nivdstkppn,ninvtax,
          sum(-nIVDzqtyin+nIVDzqtyout) as tqty,
          sum(if(cinvspecial='RJ' OR cinvspecial='RS',-nIVDAmount,nivdamount)*(1-nINVdisc1/100)*(1-nINVdisc2/100)*(1-nINVdisc3/100)) as semua
         FROM invoice
            INNER JOIN invoicedetail
           ON  cINVpk = cIVDfkINV
            INNER JOIN exchange
           ON  cINVfkexc = cexcpk
            INNER JOIN stock
           ON  cIVDfkSTK = cSTKpk
            INNER JOIN stockdetail
           ON  cSTKpk = cSTDfkSTK
         WHERE nstdkey = 1 and nIVDkirim=1 AND (cINVspecial='JL' or cINVspecial='RJ' or cINVspecial='PS' or cINVspecial='RS')
            and dinvdate>= ? and dinvdate<= ? `;
            const filterColumns = columnsToFilter ? columnsToFilter.toString().split(',').map(item => item.trim()) : [];
            if (searchValue) {
                query += ' AND (';
                query += filterColumns.map(column => `${column} LIKE ?`).join(' OR ');
                query += ')';
                parameters.push(...filterColumns.map(() => `%${searchValue}%`));
            }
        if (warehouse) {
            query+= ` and (IFNULL(?, cinvfkwhs) = cinvfkwhs or cinvfkwhs is null) `
            parameters.push(decodeURIComponent(warehouse));
        }
        if (stockGroup) {
            query+= ` and (IFNULL(?, cstkfkgrp) = cstkfkgrp or cstkfkgrp is null)  `;
            parameters.push(decodeURIComponent(stockGroup));
        }
                               
        query+= ` group by nstkppn,cinvspecial,civdfkinv,cstdcode, cstkdesc, cexcdesc,ninvdisc,nivdstkppn,ninvtax 
         order by cexcdesc,cstdcode
        ) as b
        
        on a.civdfkinv=b.civdfkinv
        group by cstdcode,cstkdesc,cexcdesc
         ) AS c, (SELECT @currentGroup := '', @currentSum := 0, @currentGroupAmountTax := '', @currentSumAmountTax := 0) r
        order by ${sortBy} ${sortOrder}`;
        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Sales_Analyst}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log('stockGroup: ', decodeURIComponent(stockGroup));
        console.log(`=============================================`);
        const response = await this.genericRepository.query<SalesAnalystDTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}