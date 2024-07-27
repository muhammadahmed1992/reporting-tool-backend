import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import ApiResponse from 'src/helper/api-response';
import Constants from 'src/helper/constants';
import ResponseHelper from 'src/helper/response-helper';
import { GenericRepository } from 'src/repository/generic.repository';

@Injectable({ scope: Scope.REQUEST })
export class SchemaInformationService {
    constructor(private readonly genericRepository: GenericRepository) {}

    async getDatabaseInformation(): Promise<ApiResponse<any>> {
        let query = `
                SELECT SCHEMA_NAME
                FROM information_schema.SCHEMATA
                WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sakila', 'world', 'sys')
                AND SCHEMA_NAME NOT LIKE 'vpm%'
        `;

        const response = await this.genericRepository.query<any>(query);
        if (response?.length) {
            return ResponseHelper.CreateResponse<any[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<any[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }       
    }

    async getStockGroupList(): Promise<ApiResponse<any>> {
        let query = `
                select cgrppk, cgrpdesc from stockgroup order by cgrpdesc;
        `;

        const response = await this.genericRepository.query<any>(query);
        if (response?.length) {
            return ResponseHelper.CreateResponse<any[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<any[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }

    async getWarehouseList(): Promise<ApiResponse<any>> {
        let query = `
                select cwhspk, cwhsdesc from warehouse order by cwhsdesc;
        `;

        const response = await this.genericRepository.query<any>(query);
        if (response?.length) {
            return ResponseHelper.CreateResponse<any[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<any[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}
