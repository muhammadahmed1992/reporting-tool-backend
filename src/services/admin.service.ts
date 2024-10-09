import { HttpStatus, Injectable } from "@nestjs/common";
import ApiResponse from "src/helper/api-response";
import ResponseHelper from "src/helper/response-helper";
import { GenericRepository } from "src/repository/generic.repository";

@Injectable()
export class AdminService {
    constructor(private readonly genericRepository: GenericRepository) {}
    async validateLicense(imei: string): Promise<ApiResponse<string>> {
        const hashedLicense = `select left(sha1(concat('ahmed','${imei}','jerry')),5) as resultID`;
        const response = await this.genericRepository.query<any>(hashedLicense);
        return ResponseHelper.CreateResponse<string>(response[0].resultID, HttpStatus.OK);
    }
}