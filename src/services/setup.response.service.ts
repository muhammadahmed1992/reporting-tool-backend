import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import ApiResponse from 'src/helper/api-response';
import Constants from 'src/helper/constants';
import ResponseHelper from 'src/helper/response-helper';
import { GenericRepository } from 'src/repository/generic.repository';

@Injectable({ scope: Scope.REQUEST })
export class SetupResponseService {
    constructor(private readonly genericRepository: GenericRepository) {}
    async getCustomerList(): Promise<ApiResponse<any>> {
        let query = `select centpk, LTRIM(RTRIM(centdesc)) from entity where nentcust=1 and nentsuspend=0 order by centdesc asc`;

        const response = await this.genericRepository.query<any>(query);
        if (response?.length) {
            return ResponseHelper.CreateResponse<any[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<any[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }

    async getSalesmanList(): Promise<ApiResponse<any>> {
        let query = `select csampk, LTRIM(RTRIM(csamdesc)) from salesman where nsamsuspend=0 order by csamdesc asc`;

        const response = await this.genericRepository.query<any>(query);
        if (response?.length) {
            return ResponseHelper.CreateResponse<any[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<any[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }

    async getStockNameList(): Promise<ApiResponse<any>> {
        let query = `select cstdcode, concat(cstdcode, ' - ', Trim(cstkdesc)) as 'stockItem' from stock s join stockdetail d on d.cstdfkstk = s.cstkpk;`;

        const response = await this.genericRepository.query<any>(query);
        if (response?.length) {
            return ResponseHelper.CreateResponse<any>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<any[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }

    async getStockNameListForStockAdjusment(): Promise<ApiResponse<any>> {
        let query = `select cstdcode, concat(cstdcode, ' - ', Trim(cstkdesc)) as 'stockItem' from stock s join stockdetail d on d.cstdfkstk = s.cstkpk and d.nstdfactor=1;
        order by cstdcode ASC`;
        
        const response = await this.genericRepository.query<any>(query);

        if (response?.length) {
            return ResponseHelper.CreateResponse<any>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<any[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}