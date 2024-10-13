import { HttpStatus, Injectable } from "@nestjs/common";
import ApiResponse from "src/helper/api-response";
import ResponseHelper from "src/helper/response-helper";
import { GenericRepository } from "src/repository/generic.repository";
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
    constructor(private readonly genericRepository: GenericRepository) {}
    async validateLicense(imei: string, key: string): Promise<ApiResponse<boolean>> {
        const hashedLicense = `select left(sha1(concat('ahmed','${imei}','jerry')),5) as resultID`;
        const hashedPassword = crypto.createHash('sha1').update(`ahmed${imei}jerry`).digest('hex');
        console.log(`hasedPasword: ${hashedPassword.substring(0, 5)}`);
        console.log(`if pwd and key are same }`);
        console.log(`hashedLicense: ${hashedLicense}`);
        const response = await this.genericRepository.query<any>(hashedLicense);
        const actualPassword = hashedPassword.substring(0, 5);
        return ResponseHelper.CreateResponse<boolean>(actualPassword === key, HttpStatus.OK);
    }
}