import { HttpStatus, Injectable } from "@nestjs/common";
import * as crypto from 'crypto';
import ApiResponse from "src/helper/api-response";
import ResponseHelper from "src/helper/response-helper";

@Injectable()
export class AdminService {
    async validateLicense(imei: string): Promise<ApiResponse<string>> {
        const hashedLicense = crypto.createHash('sha1').update(`ahmed${imei}jerry`).digest('hex');
        return ResponseHelper.CreateResponse<string>(hashedLicense.substring(0, 6), HttpStatus.OK);
    }
}