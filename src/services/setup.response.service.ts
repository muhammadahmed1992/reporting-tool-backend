import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import ApiResponse from 'src/helper/api-response';
import Constants from 'src/helper/constants';
import ResponseHelper from 'src/helper/response-helper';
import { GenericRepository } from 'src/repository/generic.repository';

@Injectable({ scope: Scope.REQUEST })
export class SetupResponseService {
  constructor(private readonly genericRepository: GenericRepository) {}
  async getCustomerList(): Promise<ApiResponse<any>> {
    const query = `select centpk, concat(centcode, ' - ', Trim(centdesc)) as centdesc from entity where nentcust=1 and nentsuspend=0 order by centdesc asc`;

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
        let query = `SELECT cstdcode, 
    CONCAT(
        CAST(cstdcode AS CHAR CHARACTER SET utf8),
        ' - ',
        CAST(TRIM(cstkdesc) AS CHAR CHARACTER SET utf8),
        ' - ',
        CAST(FORMAT(nstdretail,0) AS CHAR CHARACTER SET utf8)
    ) AS stockItem
FROM stock s JOIN stockdetail d 
    ON d.cstdfkstk = s.cstkpk
WHERE nstksuspend = 0 ORDER BY cstdcode ASC`; 

        const response = await this.genericRepository.query<any>(query);
        console.log(response);
        if (response?.length) {
            return ResponseHelper.CreateResponse<any>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<any[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }

    async getStockNameListForStockAdjusment(): Promise<ApiResponse<any>> {
        let query = `select cstdcode, concat(cstdcode, ' - ', Trim(cstkdesc)) as 'stockItem' from stock s join stockdetail d on d.cstdfkstk = s.cstkpk and d.nstdfactor=1 and nstksuspend=0 order by cstdcode asc`;
        
        const response = await this.genericRepository.query<any>(query);
        console.log(response);
        if (response?.length) {
            return ResponseHelper.CreateResponse<any>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<any[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}