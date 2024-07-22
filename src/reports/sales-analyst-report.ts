import { Injectable, HttpStatus } from '@nestjs/common';

import { GenericRepository } from '../repository/generic.repository'

import { ReportStrategy } from '../interfaces-strategy/report-strategy';

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';

import { SalesAnalystDTO } from '../dto/sales-analyst.dto';
import { ReportName } from 'src/helper/enums/report-names.enum';

@Injectable()
export class SalesAnalystReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(...params: any): Promise<ApiResponse<any>> {

        let [startDate, endDate, warehouse, stockGroup] = params;
 
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
        
        const parameters = [];
        parameters.push(startDate);
        parameters.push(endDate);
        let query = 
        `select cstdcode as StockID,cstkdesc as StockName,sum(tqty) as Qty,cexcdesc as Curr,sum(semua-if(cinvspecial='RJ' or cinvspecial='RS',
        -ninvdisc,ninvdisc)/rows2) as Amount,
        sum((semua-if(cinvspecial='RJ' or cinvspecial='RS',-ninvdisc,ninvdisc)/rows2)*(1+if(nivdstkppn=1,ninvtax/100,0))) as Amount_tax
        
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
            and dinvdate>= ? and dinvdate<= ? `
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
        `;
        console.log(`Report Name: ${ReportName.Sales_Analyst}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log('stockGroup: ', decodeURIComponent(stockGroup));
        console.log(`=============================================`);
        const response = await this.genericRepository.query<SalesAnalystDTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>(response, HttpStatus.OK, 'Data retrieved successfully.');
        } else {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>([], HttpStatus.NOT_FOUND, 'Data not found on these parameters.');
        }
    }
}