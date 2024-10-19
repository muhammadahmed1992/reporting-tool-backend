import { Controller, Get, Query } from "@nestjs/common";
import { AdminService } from "src/services/admin.service";

@Controller('admin')
export class AdminController {
    constructor (private readonly adminService: AdminService) {}

    @Get('/validate/license')
    async validate(@Query('imei') imei: string, @Query('key') key: string) {
        return this.adminService.validateLicense(imei, key);
    }
}