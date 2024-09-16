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
        SELECT COUNT(DISTINCT cinvrefno) as total_rows
FROM invoice
INNER JOIN invoicedetail ON cinvpk = civdfkinv
INNER JOIN exchange ON cinvfkexc = cexcpk
LEFT JOIN entity ON cinvfkent = centpk
WHERE (cinvspecial = 'JL' OR cinvspecial = 'RJ' OR cinvspecial = 'PS' OR cinvspecial = 'RS')
AND dinvdate >= ? AND dinvdate <= ?
`;
              if (searchValue) {
                count += ' AND (';
                count += filterColumns.map(column => `${column} LIKE ?`).join(' OR ');
                count += ')';
                countParameters.push(...filterColumns.map(() => `%${searchValue}%`));
            }
        if (warehouse) {
            count += ` AND (IFNULL(?, cinvfkwhs) = cinvfkwhs OR cinvfkwhs IS NULL) `;
            countParameters.push(decodeURIComponent(warehouse));
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
        if (searchValue) {
            query += ' AND (';
            query += filterColumns.map(column => `${column} LIKE ?`).join(' OR ');
            query += ')';
            parameters.push(...filterColumns.map(() => `%${searchValue}%`));
        }
        if (warehouse) {
            query+= `and (IFNULL(?, cinvfkwhs) = cinvfkwhs or cinvfkwhs is null) `;
            parameters.push(decodeURIComponent(warehouse));
        }
        const sortBy = sortColumn ? sortColumn : 'currency_header,date_header,invoice_header';  
        const sortOrder = sortDirection ? sortDirection : 'ASC';
        query += `
        group by cinvrefno,dinvdate,centdesc,cexcdesc,ninvdisc1,ninvdisc2,ninvdisc3,ninvtax,ninvfreight,cinvspecial
        ) AS c, (SELECT @currentGroup := '', @currentSum := 0) r 
         order by ${sortBy} ${sortOrder} 
         LIMIT ? OFFSET ?`;
        const offset = (pageNumber - 1) * pageSize;
        parameters.push(pageSize);
        parameters.push(offset);
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