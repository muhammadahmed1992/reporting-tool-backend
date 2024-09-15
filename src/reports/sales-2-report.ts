import { Injectable, HttpStatus } from '@nestjs/common';

import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository'
import { Sales2DTO } from './../dto/sales-2.dto';

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';
@Injectable()
export class Sales2Report implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        let {startDate, endDate, warehouse, pageSize} = queryString;
        const parameters = [];
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
        parameters.push(startDate);
        parameters.push(endDate);
        let count = `
        SELECT COUNT(1) as total_rows
            FROM invoice
            INNER JOIN invoicedetail ON cinvpk = civdfkinv
            INNER JOIN exchange ON cinvfkexc = cexcpk
            LEFT JOIN entity ON cinvfkent = centpk
            WHERE (cinvspecial = 'JL' OR cinvspecial = 'RJ' OR cinvspecial = 'PS' OR cinvspecial = 'RS') 
              AND dinvdate >= ? 
              AND dinvdate <= ? `;
        
        if (warehouse) {
            count += ` AND (IFNULL(?, cinvfkwhs) = cinvfkwhs OR cinvfkwhs IS NULL) `;
        }        

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
        DATE_FORMAT(dinvdate,'%d-%m-%Y') as Date,
        LTRIM(RTRIM(centdesc)) as Customer,
        cexcdesc as Currency,
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
        order by currency,date,invoice) AS c, (SELECT @currentGroup := '', @currentSum := 0) r `;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Sales_No_Disc}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log(`=============================================`);   
        const [response, totalRows] = await Promise.all([
            this.genericRepository.query<Sales2DTO>(query, parameters), 
            this.genericRepository.query<Sales2DTO>(count, parameters)
        ]);
        const totalPages = Math.ceil((totalRows[0] as any).total_rows / pageSize);
        if (response?.length) {
            return ResponseHelper.CreateResponse<Sales2DTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS, {
                paging: {
                    totalPages
                }
            });
        } else {
            return ResponseHelper.CreateResponse<Sales2DTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND, {
                paging: {
                    totalPages: 1
                }
            });
        }
    }
}