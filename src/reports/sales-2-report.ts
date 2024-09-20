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
        let {startDate, endDate, warehouse, sortColumn, sortDirection, searchValue, columnsToFilter } = queryString;
        let sortBy;

        const sortOrder = !sortDirection ? 'ASC' : sortDirection;

        if(!sortColumn || sortColumn === 'currency_header' || sortColumn === 'invoice_header') {
            if(sortColumn === 'currency_header')
                sortBy = ` currency_header ${sortOrder},invoice_header`;
            else 
                sortBy = ` currency_header ,invoice_header ${sortOrder}`;
        }else if (sortColumn === 'date_header') {
            sortBy = ` currency_header, STR_TO_DATE(date_header, '%d-%m-%Y') ${sortOrder}, invoice_header `;
        }else {
            sortBy = ` currency_header, CAST(REPLACE(${sortColumn}, ',', '') AS SIGNED) ${sortOrder} ,invoice_header`;
        }
     
        const parameters = [];
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
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
        DATE_FORMAT(dinvdate,'%d-%m-%Y') as Date,
        LTRIM(RTRIM(centdesc)) as Customer,
        cexcdesc as Currency,
        sum(if(cinvspecial='RJ' or cinvspecial='RS',-nIVDAmount,nIVDAmount)*(1-nInvDisc1/100)*(1-nInvDisc2/100)*(1-nInvDisc3/100)*(if(nivdstkppn=1,1+ninvtax/100,1)))+if(cinvspecial='RJ' or cinvspecial='RS',-ninvfreight,ninvfreight) as Amount
        from invoice
        inner join invoicedetail on cinvpk=civdfkinv
        inner join exchange on cinvfkexc=cexcpk
        left join entity on cinvfkent=centpk
        where (cinvspecial='JL' or cinvspecial='RJ' or cinvspecial='PS' or cinvspecial='RS') 
        and dinvdate>=? and dinvdate<=? `;
        const filterColumns = columnsToFilter ? columnsToFilter.toString().split(',').map(item => item.trim()) : [];
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

        query += `
        group by cinvrefno,dinvdate,centdesc,cexcdesc,ninvdisc1,ninvdisc2,ninvdisc3,ninvtax,ninvfreight,cinvspecial
        ) AS c, (SELECT @currentGroup := '', @currentSum := 0) r 
         order by ${sortBy}`;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Sales_No_Disc}`);
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