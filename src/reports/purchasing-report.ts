import { Injectable, HttpStatus } from '@nestjs/common';


import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { SalesDTO } from '../dto/sales.dto';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { PurchasingDTO } from 'src/dto/purchasing-report.dto';

@Injectable()
export class PurchaseReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(...param: any): Promise<ApiResponse<any>> {
        let [startDate, endDate, warehouse] = param;
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
        SELECT Invoice, Date, IFNULL(Supplier, '') Supplier, Curr, 
            FORMAT(Amount, 0) As Amount,
            FORMAT(IF(@currentGroup <> Curr, 
                IF(@currentGroup:= Curr, @currentSum:= 0, @currentSum:= Amount), 
                @currentSum:= @currentSum + Amount
            ),0) AS SubTotal
        FROM (
        select 
        LTRIM(RTRIM(cinvrefno)) as Invoice,
        DATE_FORMAT(dinvdate,'%d-%m-%Y') as 'Date',
        LTRIM(RTRIM(centdesc)) as Supplier,
        LTRIM(RTRIM(cexcdesc)) as Curr,
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
        sum(if(cinvspecial='RB',-nIVDAmount,nIVDAmount)*(1-nInvDisc1/100)*(1-nInvDisc2/100)*(1-nInvDisc3/100)) as sumdetails,
        if(cinvspecial='RB',-nINVfreight,nINVfreight) as nfreight,if(cinvspecial='RB',-nINVdisc,nINVdisc) as ndisc
        from invoice
        inner join invoicedetail on cinvpk=civdfkinv
        inner join exchange on cinvfkexc=cexcpk
        left join entity on cinvfkent=centpk
        where (cinvspecial='BL' or cinvspecial='RB' or cinvspecial='KS')
        group by civdfkstk,civdfkinv,ninvdisc,nivdstkppn,ninvtax,cinvrefno,dinvdate,centdesc,cexcdesc,nINVfreight,nINVdisc) as b

        on a.civdfkinv=b.civdfkinv
        group by cinvrefno,dinvdate,centdesc,cexcdesc,nfreight
        order by curr,date,invoice) AS a, (SELECT @currentGroup := '', @currentSum := 0) r; `;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Purchase_Report}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log(`==================================================`);

        if (warehouse)
            parameters.push(decodeURIComponent(warehouse));

        const response = await this.genericRepository.query<PurchasingDTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<PurchasingDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<PurchasingDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}