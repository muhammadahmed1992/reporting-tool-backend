import { Injectable, HttpStatus } from '@nestjs/common';


import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { SalesDTO } from '../dto/sales.dto';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';
@Injectable()
export class SalesReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        let {startDate, endDate, warehouse} = queryString;
        
        const parameters = [];
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
        console.log(`startDate: ${startDate}`);
        console.log(`endDate: ${endDate}`);
        parameters.push(startDate);
        parameters.push(endDate);
        let query = `
       SELECT Invoice as invoice_header, Date as date_header, Currency as currency_header,
            FORMAT(Amount,0) AS amount_header,
            FORMAT(IF(@currentGroup <> Currency, 
                IF(@currentGroup:= Currency, @currentSum:= 0, @currentSum:= Amount), 
                @currentSum:= @currentSum + Amount
            ),0) AS subtotal_header
        FROM (
        select 
        LTRIM(RTRIM(cinvrefno)) as Invoice,
        DATE_FORMAT(dinvdate,'%d-%m-%Y') as 'Date',
        LTRIM(RTRIM(centdesc)) as Customer,
        LTRIM(RTRIM(cexcdesc)) as Currency,
        sum((sumdetails-ndisc/rows2)*(if(nivdstkppn=1,1+ninvtax/100,1)))+nfreight as 'Amount' from
        (select civdfkinv,count(1) as rows2 from invoicedetail
        inner join invoice on civdfkinv=cinvpk
        and dinvdate>=? and dinvdate<=? `
        if (warehouse) {
            query+= ` and (IFNULL(?, cinvfkwhs) = cinvfkwhs or cinvfkwhs is null) `;
        } 
        query+= ` group by civdfkinv) as a

        inner join

        (select civdfkstk,civdfkinv,ninvdisc,nivdstkppn,ninvtax,cinvrefno,dinvdate,centdesc,cexcdesc,
        sum(if(cinvspecial='RJ' or cinvspecial='RS',-nIVDAmount,nIVDAmount)*(1-nInvDisc1/100)*(1-nInvDisc2/100)*(1-nInvDisc3/100)) as sumdetails,
        if(cinvspecial='RJ' or cinvspecial='RS',-nINVfreight,nINVfreight) as nfreight,if(cinvspecial='RJ' or cinvspecial='RS',-nINVdisc,nINVdisc) as ndisc
        from invoice
        inner join invoicedetail on cinvpk=civdfkinv
        inner join exchange on cinvfkexc=cexcpk
        left join entity on cinvfkent=centpk
        where (cinvspecial='JL' or cinvspecial='RJ' or cinvspecial='PS' or cinvspecial='RS')
        group by civdfkstk,civdfkinv,ninvdisc,nivdstkppn,ninvtax,cinvrefno,dinvdate,centdesc,cexcdesc,nINVfreight,nINVdisc) as b

        on a.civdfkinv=b.civdfkinv
        group by cinvrefno,dinvdate,centdesc,cexcdesc,nfreight
        order by currency,date,invoice) AS a, (SELECT @currentGroup := '', @currentSum := 0) r; `;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Sales}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log(`==================================================`);
        console.log({queryString});
        if (warehouse)
            parameters.push(decodeURIComponent(warehouse));

        const response = await this.genericRepository.query<SalesDTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<SalesDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<SalesDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}