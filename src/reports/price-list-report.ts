import { Injectable, HttpStatus } from '@nestjs/common';


import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { PriceListDTO } from 'src/dto/price-list.dto';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';

@Injectable()
export class PriceListReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(...params: any): Promise<ApiResponse<any>> {
        const [stockGroup] = params;
        let query = `
        SELECT cSTDcode StockID, LTRIM(RTRIM(cSTKdesc)) StockName,
        FORMAT(nSTDprice,0) as Price,cUNIdesc Unit
        FROM Stock INNER JOIN Stockdetail
        ON Stock.cSTKpk = Stockdetail.cSTDfkSTK
        INNER JOIN Unit
        ON Stockdetail.cSTDfkUNI = Unit.cUNIpk
        inner join stockgroup on cstkfkgrp = cgrppk
        where 1=1 `
        if (stockGroup) {
            query+= ` and (IFNULL(?, cstkfkgrp) = cstkfkgrp or cstkfkgrp is null) `;
        }
        query+= `  ORDER BY cstdcode,nstdfactor ASC `;
        
        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.PriceList}`);
        console.log('parameter: stockGroup: ', decodeURIComponent(stockGroup));
        console.log('=====================================');
        const response = await this.genericRepository.query<PriceListDTO>(query, [decodeURIComponent(stockGroup)]);
        if (response?.length) {
            return ResponseHelper.CreateResponse<PriceListDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<PriceListDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}