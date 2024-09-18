import { Injectable, HttpStatus } from '@nestjs/common';

import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { PurchasingReportNoDiscDTO } from 'src/dto/purchasing-report-no-disc.dto';
import { QueryStringDTO } from 'src/dto/query-string.dto';
@Injectable()

export class PurchaseReportNoDisc implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        let {startDate, endDate, warehouse, sortColumn, sortDirection, searchValue, columnsToFilter } = queryString;
        const sortBy = sortColumn ? sortColumn : 'currency_header,date_header,invoice_header';  
        const sortOrder = sortDirection ? sortDirection : 'ASC';
        const parameters = [];
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
        parameters.push(startDate);
        parameters.push(endDate);
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
        DATE_FORMAT(dinvdate,'%d-%m-%Y') as Date,
        LTRIM(RTRIM(centdesc)) as Supplier,
        cexcdesc as Currency,
        sum(if(cinvspecial='RB',-nIVDAmount,nIVDAmount)*(1-nInvDisc1/100)*(1-nInvDisc2/100)*(1-nInvDisc3/100)*(if(nivdstkppn=1,1+ninvtax/100,1)))+if(cinvspecial='RB',-ninvfreight,ninvfreight) as Amount
        from invoice
        inner join invoicedetail on cinvpk=civdfkinv
        inner join exchange on cinvfkexc=cexcpk
        left join entity on cinvfkent=centpk
        where (cinvspecial='BL' or cinvspecial='RB' or cinvspecial='KS') 
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
        order by ${sortBy} ${sortOrder}`;

        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Purchase_Report_No_Disc}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log(`=============================================`);   
        const response = await this.genericRepository.query<PurchasingReportNoDiscDTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<PurchasingReportNoDiscDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<PurchasingReportNoDiscDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}