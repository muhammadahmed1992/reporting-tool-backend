import { HttpStatus, Injectable } from "@nestjs/common";
import ApiResponse from "src/helper/api-response";
import ResponseHelper from "src/helper/response-helper";
import { GenericRepository } from "src/repository/generic.repository";
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
    constructor(private readonly genericRepository: GenericRepository) {}
    async validateLicense(imei: string, key: string): Promise<ApiResponse<boolean>> {
        const hashedLisence = crypto.createHash('sha1').update(`ahmed${imei}jerry`).digest('hex');
        const actualPassword = hashedLisence.substring(0, 5);
        return ResponseHelper.CreateResponse<boolean>(actualPassword === key, HttpStatus.OK);
    }
}