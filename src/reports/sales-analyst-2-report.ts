import { Injectable, HttpStatus } from '@nestjs/common';

import { GenericRepository } from '../repository/generic.repository'

import { ReportStrategy } from '../interfaces-strategy/report-strategy';

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';

import { SalesAnalystDTO } from '../dto/sales-analyst.dto';

@Injectable()
export class SalesAnalyst2Report implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(...params: any): Promise<ApiResponse<any>> {
        let query = 
        `
        SELECT cstdcode as StockID, cstkdesc as StockName,
  sum(-nIVDzqtyin+nIVDzqtyout) as Qty, cexcdesc as Curr,
  sum(if(cinvspecial='RJ' OR cinvspecial='RS',-nIVDAmount,nivdamount)*(1-nINVdisc1/100)*(1-nINVdisc2/100)*(1-nINVdisc3/100)) as Amount,
  sum(if(cinvspecial='RJ' OR cinvspecial='RS',-nIVDAmount,nivdamount)*(1-nINVdisc1/100)*(1-nINVdisc2/100)*(1-nINVdisc3/100)*(1+if(nivdstkppn=1,ninvtax/100,0))) as Amount_Tax
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
	and dinvdate>=? and dinvdate<=?
	and cinvfkwhs=?
	and cstkfkgrp=?
  group by cstdcode, cstkdesc, cexcdesc
 order by cexcdesc,cstdcode
        `;
        const [startDate, endDate, warehouse, stockGroup] = params;
        const response = await this.genericRepository.query<SalesAnalystDTO>(query, [startDate, endDate, warehouse, stockGroup]);
        if (response?.length) {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>(response, HttpStatus.OK, 'Data retrieved successfully.');
        } else {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>([], HttpStatus.NOT_FOUND, 'Data not found on these parameters.');
        }
    }
}