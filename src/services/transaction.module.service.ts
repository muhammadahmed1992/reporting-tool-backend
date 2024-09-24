import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import { ReportFactory } from './../factory/report-factory';
import ApiResponse from 'src/helper/api-response';
import { GenericRepository } from 'src/repository/generic.repository';
import {TransactionSalesDto} from '../dto/transaction-sales.dto';
import ResponseHelper from 'src/helper/response-helper';
import Constants from 'src/helper/constants';

@Injectable({ scope: Scope.REQUEST })
export class TransactionModuleService {
    constructor(private readonly genericRepository: GenericRepository) {}
    async sales() {
        const query = `SELECT
    (Select L_jual from ymk) AS InvoiceNo,
    (SELECT candfkwhs FROM android2 WHERE canddesc = 'bos') AS Warehouse,
    (SELECT gst FROM ymk3) AS Tax,
    ('') as Customer,
    ('') as Salesman,
    (CURDATE()) as 'Date'
`;
        const response = await this.genericRepository.query<TransactionSalesDto>(query);
        console.log(response);
        if (response?.length) {
            return ResponseHelper.CreateResponse<any>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<any>(null, HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}   