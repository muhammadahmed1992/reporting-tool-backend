import { Injectable, HttpStatus } from '@nestjs/common';


import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { SalesDTO } from '../dto/sales.dto';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';

@Injectable()
export class SalesReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(...param: any): Promise<ApiResponse<any>> {
        let query = `
        select cinvrefno as Invoice,dinvdate as 'Date',centdesc as Customer,cexcdesc as Curr,
        sum((sumdetails-ndisc/'rows')*(if(nivdstkppn=1,1+ninvtax/100,1)))+nfreight as 'Amount' from

(select civdfkinv,count(*) as 'rows' from invoicedetail
inner join invoice on civdfkinv=cinvpk
and dinvdate>=? and dinvdate<=?
and cinvfkwhs=?
group by civdfkinv) as a

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
group by cinvrefno,dinvdate,centdesc,cexcdesc
order by curr,date,invoice
    `;
        const [startDate, endDate, warehouse] = param;
        const response = await this.genericRepository.query<SalesDTO>(query, [startDate, endDate, warehouse.replace(' ', '+')]);
        if (response?.length) {
            return ResponseHelper.CreateResponse<SalesDTO[]>(response, HttpStatus.OK, 'Data retrieved successfully.');
        } else {
            return ResponseHelper.CreateResponse<SalesDTO[]>([], HttpStatus.NOT_FOUND, 'Data not found on these parameters.');
        }
    }
}