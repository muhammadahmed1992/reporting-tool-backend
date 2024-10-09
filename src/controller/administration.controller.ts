import { Controller, Get, Query } from "@nestjs/common";
import { AdminService } from "src/services/admin.service";

@Controller('admin')
export class AdminController {
    constructor (private readonly adminService: AdminService) {}

    @Get('/validate/license')
    async validate(@Query('imei') imei: string) {
        return this.adminService.validateLicense(imei);
    }
}