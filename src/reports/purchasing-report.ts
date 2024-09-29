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
            sortBy = ` currency_header, ${sortColumn === 'supplier_header' ? `${sortColumn}` : `CAST(REPLACE(${sortColumn}, ',', '') AS SIGNED)`} ${sortOrder} ,invoice_header`;
        }
        const parameters = [];

        console.log(`startDate: ${startDate}`);
        console.log(`endDate: ${endDate}`);
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
        DATE_FORMAT(dinvdate,'%d-%m-%Y') as 'Date',
        LTRIM(RTRIM(centdesc)) as Supplier,
        LTRIM(RTRIM(cexcdesc)) as Currency,
        sum((sumdetails-ndisc/rows2)*(if(nivdstkppn=1,1+ninvtax/100,1)))+nfreight as 'Amount' from
        (select civdfkinv,count(1) as rows2 from invoicedetail
        inner join invoice on civdfkinv=cinvpk
        and dinvdate>=? and dinvdate<=? `;
        const filterColumns = columnsToFilter ? columnsToFilter.toString().split(',').map(item => item.trim()) : [];
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
        ) AS a, (SELECT @currentGroup := '', @currentSum := 0) r 
        order by ${sortBy}`;

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