import { Injectable, HttpStatus } from '@nestjs/common';


import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { PriceListDTO } from 'src/dto/price-list.dto';

@Injectable()
export class PriceListReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(...params: any): Promise<ApiResponse<any>> {
        let query = `
        SELECT cSTDcode StockID, cSTKdesc StockName,
        nSTDprice as Price,cUNIdesc Unit
        FROM Stock INNER JOIN Stockdetail
        ON Stock.cSTKpk = Stockdetail.cSTDfkSTK
        INNER JOIN Unit
        ON Stockdetail.cSTDfkUNI = Unit.cUNIpk
        inner join stockgroup on cstkfkgrp = cgrppk
        where 1=1
        and (IFNULL(?, cstkfkgrp) = cstkfkgrp or cstkfkgrp is null)
        ORDER BY cstdcode,nstdfactor ASC
        `;
        const [stockGroup] = params;
        console.log('parameter: ', decodeURIComponent(stockGroup));
        const response = await this.genericRepository.query<PriceListDTO>(query, [decodeURIComponent(stockGroup)]);
        if (response?.length) {
            return ResponseHelper.CreateResponse<PriceListDTO[]>(response, HttpStatus.OK, 'Data retrieved successfully.');
        } else {
            return ResponseHelper.CreateResponse<PriceListDTO[]>([], HttpStatus.NOT_FOUND, 'Data not found on these parameters.');
        }
    }
}