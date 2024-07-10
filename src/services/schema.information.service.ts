import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { GenericRepository } from 'src/repository/generic.repository';

@Injectable({ scope: Scope.REQUEST })
export class SchemaInformationService {
    constructor(private readonly genericRepository: GenericRepository) {}

    async getDatabaseInformation(): Promise<ApiResponse<any>> {
        let query = `
                SELECT 'SCHEMA_NAME'
                FROM information_schema.SCHEMATA;
        `;

        const response = await this.genericRepository.query<any>(query);
        if (response?.length) {
            return ResponseHelper.CreateResponse<any[]>(response, HttpStatus.OK, 'Data retrieved successfully.');
        } else {
            return ResponseHelper.CreateResponse<any[]>([], HttpStatus.NOT_FOUND, 'Data not found on these parameters.');
        }       
    }
}
