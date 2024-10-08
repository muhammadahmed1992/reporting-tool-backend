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
export class PurchaseAnalystReportNoDisc implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        let {startDate, endDate, warehouse, stockGroup} = queryString;
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
        let count = `Select Count(1) as total_rows FROM (
        SELECT cstdcode as StockID, LTRIM(RTRIM(cstkdesc)) as StockName,
        sum(nivdzqtyin-nivdzqtyout) as Qty, cexcdesc as Currency,
        sum(if(cinvspecial='RB',-nIVDAmount,nivdamount)*(1-nINVdisc1/100)*(1-nINVdisc2/100)*(1-nINVdisc3/100)) as Amount,
        sum(if(cinvspecial='RB',-nIVDAmount,nivdamount)*(1-nINVdisc1/100)*(1-nINVdisc2/100)*(1-nINVdisc3/100)*(1+if(nivdstkppn=1,ninvtax/100,0))) as Amount_Tax
        FROM invoice
            INNER JOIN invoicedetail
        ON  cINVpk = cIVDfkINV
            INNER JOIN exchange
        ON  cINVfkexc = cexcpk
            INNER JOIN stock
        ON  cIVDfkSTK = cSTKpk
            INNER JOIN stockdetail
        ON  cSTKpk = cSTDfkSTK
        WHERE nstdkey = 1 and nIVDkirim=1 AND (cINVspecial='BL' or cINVspecial='RB' or cINVspecial='KS' or cINVspecial='RS')
        and dinvdate>=? and dinvdate<=? `;
    if (stockGroup) {
        count+= ` and (IFNULL(?, cstkfkgrp) = cstkfkgrp or cstkfkgrp is null) `;
    }
	if (warehouse){
        count+= ` and (IFNULL(?, cinvfkwhs) = cinvfkwhs or cinvfkwhs is null)`;
    }
    count += ` group by cstdcode, cstkdesc, cexcdesc`;
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
        SELECT cstdcode as StockID, LTRIM(RTRIM(cstkdesc)) as StockName,
        sum(nivdzqtyin-nivdzqtyout) as Qty, cexcdesc as Currency,
        sum(if(cinvspecial='RB',-nIVDAmount,nivdamount)*(1-nINVdisc1/100)*(1-nINVdisc2/100)*(1-nINVdisc3/100)) as Amount,
        sum(if(cinvspecial='RB',-nIVDAmount,nivdamount)*(1-nINVdisc1/100)*(1-nINVdisc2/100)*(1-nINVdisc3/100)*(1+if(nivdstkppn=1,ninvtax/100,0))) as Amount_Tax
        FROM invoice
            INNER JOIN invoicedetail
        ON  cINVpk = cIVDfkINV
            INNER JOIN exchange
        ON  cINVfkexc = cexcpk
            INNER JOIN stock
        ON  cIVDfkSTK = cSTKpk
            INNER JOIN stockdetail
        ON  cSTKpk = cSTDfkSTK
        WHERE nstdkey = 1 and nIVDkirim=1 AND (cINVspecial='BL' or cINVspecial='RB' or cINVspecial='KS' or cINVspecial='RS')
        and dinvdate>=? and dinvdate<=? `;
    if (stockGroup) {
        query+= ` and (IFNULL(?, cstkfkgrp) = cstkfkgrp or cstkfkgrp is null) `;
    }
	if (warehouse){
        query+= ` and (IFNULL(?, cinvfkwhs) = cinvfkwhs or cinvfkwhs is null)`;
    }
    query+= `
  group by cstdcode, cstkdesc, cexcdesc
 order by cexcdesc,cstdcode ASC) AS c, (SELECT @currentGroup := '', @currentSum := 0, @currentGroupAmountTax := '', @currentSumAmountTax := 0) r 
        `; 

        const parameters = [];
        parameters.push(startDate);
        parameters.push(endDate);
        if (stockGroup){
            parameters.push(decodeURIComponent(stockGroup));
        }
        if (warehouse) {
            parameters.push(decodeURIComponent(warehouse));
        }
        
        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Purchase_Analyst_Report_No_Disc}`);
        console.log(`start Date: ${startDate}`);
        console.log(`end Date: ${endDate}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log('stockGroup: ', decodeURIComponent(stockGroup));
        console.log(`=============================================`);
        const [response, totalRows] = await Promise.all([this.genericRepository.query<SalesAnalystDTO>(query, parameters), 
            this.genericRepository.query<number>(count, parameters)]);
        console.log(totalRows);
        if (response?.length) {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}