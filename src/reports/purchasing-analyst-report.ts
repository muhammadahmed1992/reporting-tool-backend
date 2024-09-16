import { Injectable, HttpStatus } from '@nestjs/common';

import { GenericRepository } from '../repository/generic.repository'

import { ReportStrategy } from '../interfaces-strategy/report-strategy';

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';

import { SalesAnalystDTO } from '../dto/sales-analyst.dto';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class PurchaseAnalystReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {

        let {startDate, endDate, warehouse, stockGroup, pageSize, pageNumber, searchValue, columnsToFilter, sortColumn, sortDirection} = queryString;
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
        let count = 
        `
  SELECT COUNT(DISTINCT StockID) as total_rows
FROM (
    SELECT cstdcode as StockID
    FROM (
        SELECT civdfkinv, COUNT(1) as rows2 
        FROM invoicedetail
        INNER JOIN invoice ON cinvpk = civdfkinv
        WHERE nIVDkirim = 1 
        GROUP BY civdfkinv
    ) as a
    INNER JOIN (
        SELECT cstdcode
        FROM invoice
        INNER JOIN invoicedetail ON cINVpk = cIVDfkINV
        INNER JOIN exchange ON cINVfkexc = cexcpk
        INNER JOIN stock ON cIVDfkSTK = cSTKpk
        INNER JOIN stockdetail ON cSTKpk = cSTDfkSTK
        WHERE nstdkey = 1 
        AND nIVDkirim = 1 
        AND (cINVspecial = 'BL' OR cINVspecial = 'RB' OR cINVspecial = 'KS')
        AND dinvdate >= ? AND dinvdate <= ?
        GROUP BY cstdcode, cstkdesc, cexcdesc
    ) as b
) as subquery;
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

        if (stockGroup) {
            count += ` AND (IFNULL(?, cstkfkgrp) = cstkfkgrp OR cstkfkgrp IS NULL) `;
            countParameters.push(decodeURIComponent(stockGroup));
        }

        let query = 
        `
        SELECT StockID as stock_id_header, StockName as stock_name_header, FORMAT(Qty,0) as qty_header, Currency as currency_header, FORMAT(Amount, 0) as amount_header, FORMAT(Amount_Tax, 0) as amount_tax_header,
            FORMAT(IF(@currentGroup <> Currency, 
                IF(@currentGroup:= Currency, @currentSum:= 0, @currentSum:= Amount), 
                @currentSum:= @currentSum + Amount
            ),0) AS subtotal_header,
            FORMAT(IF(@currentGroupAmountTax <> Currency, 
                IF(@currentGroupAmountTax:= Currency, @currentSumAmountTax:= 0, @currentSumAmountTax:= Amount_Tax), 
                @currentSumAmountTax:= @currentSumAmountTax + Amount_Tax
            ),0) AS amount_tax_total_header   
        FROM (
        select 
        cstdcode as StockID,
        LTRIM(RTRIM(cstkdesc)) as StockName,
        sum(tqty) as Qty,
        cexcdesc as Currency,
        sum(semua-if(cinvspecial='RB' or cinvspecial='RS',-ninvdisc,ninvdisc)/rows2) as Amount,
        sum((semua-if(cinvspecial='RB' or cinvspecial='RS',-ninvdisc,ninvdisc)/rows2)*(1+if(nivdstkppn=1,ninvtax/100,0))) as Amount_Tax
        
        from
        
        (SELECT civdfkinv,count(1) as rows2 FROM invoicedetail
            INNER JOIN invoice on cinvpk=civdfkinv
            WHERE nIVDkirim=1 GROUP BY civdfkinv
        ) as a
        inner join
        (SELECT nstkppn,cinvspecial,civdfkinv,cstdcode, cstkdesc, cexcdesc,ninvdisc,nivdstkppn,ninvtax,
          sum(nivdzqtyin-nivdzqtyout) as tqty,
          sum(if(cinvspecial='RB' OR cinvspecial='RS',-nIVDAmount,nivdamount)*(1-nINVdisc1/100)*(1-nINVdisc2/100)*(1-nINVdisc3/100)) as semua
         FROM invoice
            INNER JOIN invoicedetail
           ON  cINVpk = cIVDfkINV
            INNER JOIN exchange
           ON  cINVfkexc = cexcpk
            INNER JOIN stock
           ON  cIVDfkSTK = cSTKpk
            INNER JOIN stockdetail
           ON  cSTKpk = cSTDfkSTK
         WHERE nstdkey = 1 and nIVDkirim=1 AND (cINVspecial='BL' or cINVspecial='RB' or cINVspecial='KS')
            and dinvdate>= ? and dinvdate<= ? `
            if (searchValue) {
                query += ' AND (';
                query += filterColumns.map(column => `${column} LIKE ?`).join(' OR ');
                query += ')';
                parameters.push(...filterColumns.map(() => `%${searchValue}%`));
            }
        if (warehouse) {
            query+= ` and (IFNULL(?, cinvfkwhs) = cinvfkwhs or cinvfkwhs is null) `
            parameters.push(decodeURIComponent(warehouse));
        }
        if (stockGroup) {
            query+= ` and (IFNULL(?, cstkfkgrp) = cstkfkgrp or cstkfkgrp is null)  `;
            parameters.push(decodeURIComponent(stockGroup));
        }
        const sortBy = sortColumn ? sortColumn : 'stock_name_header,stock_id_header';  
        const sortOrder = sortDirection ? sortDirection : 'ASC';                        
        query+= ` group by nstkppn,cinvspecial,civdfkinv,cstdcode, cstkdesc, cexcdesc,ninvdisc,nivdstkppn,ninvtax 
         order by cexcdesc,cstdcode
        ) as b
        
        on a.civdfkinv=b.civdfkinv
        group by cstdcode,cstkdesc,cexcdesc
       ) AS c, (SELECT @currentGroup := '', @currentSum := 0, @currentGroupAmountTax := '', @currentSumAmountTax := 0) r
         order by ${sortBy} ${sortOrder} 
        LIMIT ? OFFSET ? `;
        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Purchase_Analyst_Report}`);
        console.log('warehouse: ', decodeURIComponent(warehouse));
        console.log('stockGroup: ', decodeURIComponent(stockGroup));
        console.log(`=============================================`);
        const offset = (pageNumber - 1) * pageSize;
        parameters.push(pageSize);
        parameters.push(offset);
        const [response, totalRows] = await Promise.all([
            this.genericRepository.query<SalesAnalystDTO>(query, parameters),
            this.genericRepository.query<SalesAnalystDTO>(count, countParameters)
        ]);
        const totalPages = Math.ceil((totalRows[0] as any).total_rows / pageSize);
        if (response?.length) {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS, {
                paging: {
                    totalPages
                }
            });
        } else {
            return ResponseHelper.CreateResponse<SalesAnalystDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND, {
                paging: {
                    totalPages: 1
                }
            });
        }
    }
}