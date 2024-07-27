import { Injectable, HttpStatus } from '@nestjs/common';

import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository'
import { Sales2DTO } from './../dto/sales-2.dto';

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';

@Injectable()
export class Sales2Report implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(...params: any): Promise<ApiResponse<any>> {
        let [startDate, endDate, warehouse] = params;
        const parameters = [];
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
        parameters.push(startDate);
        parameters.push(endDate);
        let query = `
        SELECT Invoice, Date, IFNULL(Customer, '') Customer, Curr,
            FORMAT(Amount,0) AS Amount,
            FORMAT(IF(@currentGroup <> Curr, 
                IF(@currentGroup:= Curr, @currentSum:= 0, @currentSum:= Amount), 
                @currentSum:= @currentSum + Amount
            ),0) AS SubTotal
        FROM (
        select 
        LTRIM(RTRIM(cinvrefno)) as Invoice,
        DATE_FORMAT(dinvdate,'%d-%m-%Y') as Date,
        LTRIM(RTRIM(centdesc)) as Customer,
        cexcdesc as Curr,
        sum(if(cinvspecial='RJ' or cinvspecial='RS',-nIVDAmount,nIVDAmount)*(1-nInvDisc1/100)*(1-nInvDisc2/100)*(1-nInvDisc3/100)*(if(nivdstkppn=1,1+ninvtax/100,1)))+if(cinvspecial='RJ' or cinvspecial='RS',-ninvfreight,ninvfreight) as Amount
        from invoice
        inner join invoicedetail on cinvpk=civdfkinv
        inner join exchange on cinvfkexc=cexcpk
        left join entity on cinvfkent=centpk
        where (cinvspecial='JL' or cinvspecial='RJ' or cinvspecial='PS' or cinvspecial='RS') 
        and dinvdate>=? and dinvdate<=? `
        if (warehouse) {
            query+= `and (IFNULL(?, cinvfkwhs) = cinvfkwhs or cinvfkwhs is null) `;
            parameters.push(decodeURIComponent(warehouse));
        }

        query += `
        group by cinvrefno,dinvdate,centdesc,cexcdesc,ninvdisc1,ninvdisc2,ninvdisc3,ninvtax,ninvfreight,cinvspecial
        order by curr,date,invoice) AS c, (SELECT @currentGroup := '', @currentSum := 0) r `;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Sales2}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log(`=============================================`);   
        const response = await this.genericRepository.query<Sales2DTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<Sales2DTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<Sales2DTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}