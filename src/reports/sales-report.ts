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
        let {startDate, endDate, warehouse, pageSize, pageNumber, searchValue, columnsToFilter, sortColumn, sortDirection} = queryString;
        const filterColumns = columnsToFilter ? columnsToFilter.toString().split(',').map(item => item.trim()) : [];
        const parameters = []; const countParameters = [];
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
        parameters.push(startDate);
        parameters.push(endDate);
        countParameters.push(startDate);
        countParameters.push(endDate);
        let count = `
       SELECT COUNT(1) as total_rows
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
        if (searchValue) {
            count += ' AND (';
            count += filterColumns.map(column => `${column} LIKE ?`).join(' OR ');
            count += ')';
            countParameters.push(...filterColumns.map(() => `%${searchValue}%`));
        }
        if (warehouse) {
            count+= ` and (IFNULL(?, cinvfkwhs) = cinvfkwhs or cinvfkwhs is null) `;
            countParameters.push(decodeURIComponent(warehouse));
        } 
        count+= ` group by civdfkinv) as a

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
         if (searchValue) {
            query += ' AND (';
            query += filterColumns.map(column => `${column} LIKE ?`).join(' OR ');
            query += ')';
            parameters.push(...filterColumns.map(() => `%${searchValue}%`));
        }
         if (warehouse) {
             query+= ` and (IFNULL(?, cinvfkwhs) = cinvfkwhs or cinvfkwhs is null) `;
         } 
         const sortBy = sortColumn ? sortColumn : 'date,invoice';  
        const sortOrder = sortDirection ? sortDirection : 'ASC'; 
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
         order by currency, ${sortBy} ${sortOrder}) AS a, (SELECT @currentGroup := '', @currentSum := 0) r
         LIMIT ? OFFSET ?; `;
        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Sales}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log(`==================================================`);

        if (warehouse)
            parameters.push(decodeURIComponent(warehouse));
        const offset = (pageNumber - 1) * pageSize;
        parameters.push(pageSize);
        parameters.push(offset);
        const [response, totalRows] = await Promise.all([
            this.genericRepository.query<SalesDTO>(query, parameters),
            this.genericRepository.query<number>(count, countParameters)
        ]);
        const totalPages = Math.ceil((totalRows[0] as any).total_rows / pageSize);
        if (response?.length) {
            return ResponseHelper.CreateResponse<SalesDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS, {
                paging: {
                    totalPages
                }
            });
        } else {
            return ResponseHelper.CreateResponse<SalesDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND, {
                paging: {
                    totalPages: 1
                }
            });
        }
    }
}