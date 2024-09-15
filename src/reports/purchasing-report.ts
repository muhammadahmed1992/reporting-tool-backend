import { Injectable, HttpStatus } from '@nestjs/common';


import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { SalesDTO } from '../dto/sales.dto';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { PurchasingDTO } from 'src/dto/purchasing-report.dto';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class PurchaseReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        let {startDate, endDate, warehouse, pageSize, pageNumber, searchValue, columnsToFilter} = queryString;
        const filterColumns = columnsToFilter ? columnsToFilter.toString().split(',').map(item => item.trim()) : [];
        const parameters = []; const countParameters = [];
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
        parameters.push(startDate);
        parameters.push(endDate);

        let count = `
        SELECT COUNT(1) as total_rows
        FROM (
            SELECT civdfkinv, COUNT(1) as rows2 
            FROM invoicedetail
            INNER JOIN invoice ON civdfkinv = cinvpk
            WHERE dinvdate >= ? AND dinvdate <= ? `;
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
        
        count += ` 
            GROUP BY civdfkinv
        ) as a
        
        INNER JOIN (
            SELECT 
                civdfkstk, 
                civdfkinv, 
                ninvdisc, 
                nivdstkppn, 
                ninvtax, 
                cinvrefno, 
                dinvdate, 
                centdesc, 
                cexcdesc,
                SUM(
                    IF(cinvspecial = 'RB', -nIVDAmount, nIVDAmount) *
                    (1 - nInvDisc1 / 100) *
                    (1 - nInvDisc2 / 100) *
                    (1 - nInvDisc3 / 100)
                ) as sumdetails,
                IF(cinvspecial = 'RB', -nINVfreight, nINVfreight) as nfreight,
                IF(cinvspecial = 'RB', -nINVdisc, nINVdisc) as ndisc
            FROM invoice
            INNER JOIN invoicedetail ON civdfkinv = cinvpk
            INNER JOIN exchange ON cinvfkexc = cexcpk
            LEFT JOIN entity ON cinvfkent = centpk
            WHERE (cinvspecial = 'BL' OR cinvspecial = 'RB' OR cinvspecial = 'KS')
            GROUP BY civdfkstk, civdfkinv, ninvdisc, nivdstkppn, ninvtax, cinvrefno, dinvdate, centdesc, cexcdesc, nINVfreight, nINVdisc
        ) as b ON a.civdfkinv = b.civdfkinv `;
        

        let query = `
        SELECT Invoice as invoice_header, Date as date_header, IFNULL(Supplier, '') as supplier_header, Currency as currency_header,
            FORMAT(Amount,0) AS amount_header,
            FORMAT(IF(@currentGroup <> Currency, 
                IF(@currentGroup:= Currency, @currentSum:= 0, @currentSum:= Amount), 
                @currentSum:= @currentSum + Amount
            ),0) AS subtotal_header
        FROM (
        select 
        LTRIM(RTRIM(cinvrefno)) as Invoice,
        DATE_FORMAT(dinvdate,'%d-%m-%Y') as 'Date',
        LTRIM(RTRIM(centdesc)) as Supplier,
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
        order by currency,date,invoice) AS a, (SELECT @currentGroup := '', @currentSum := 0) r LIMIT ? OFFSET ?; `;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Purchase_Report}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log(`==================================================`);

        if (warehouse)
            parameters.push(decodeURIComponent(warehouse));
        const offset = (pageNumber - 1) * pageSize;
        parameters.push(pageSize);
        parameters.push(offset);
        const [response, totalRows] = await Promise.all([
            this.genericRepository.query<PurchasingDTO>(query, parameters),
            this.genericRepository.query<number>(count, countParameters)
        ]);
        const totalPages = Math.ceil((totalRows[0] as any).total_rows / pageSize);
        if (response?.length) {
            return ResponseHelper.CreateResponse<PurchasingDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS, {
                paging: {
                    totalPages
                }
            });
        } else {
            return ResponseHelper.CreateResponse<PurchasingDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND, {
                paging: {
                    totalPages: 1
                }
            });
        }
    }
}