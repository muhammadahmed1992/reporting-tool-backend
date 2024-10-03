import { Controller, Post } from "@nestjs/common";
import { AdminService } from "src/services/admin.service";

@Controller('admin')
export class AdminController {
    constructor (private readonly adminService: AdminService) {}

    @Post('validate/license')
    async validate(imei: string) {
        return this.adminService.validateLicense(imei);
    }
}