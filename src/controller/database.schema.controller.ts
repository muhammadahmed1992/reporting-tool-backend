import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { SchemaInformationService } from 'src/services/schema.information.service';
import { SchemaInfoResponseHandler } from 'src/interceptors/schema-info-response-handler.interceptor';

@Controller('schemaInfo')
export class SchemaInfoController {
  constructor(private readonly schemaInformationService: SchemaInformationService) {}

  @Get('/database-list')
  async databases(): Promise<any> {
    const result = await this.schemaInformationService.getDatabaseInformation();
    return result;
  }

  @Get('/stock-group-list')
  async stockGroup(): Promise<any> {
    const result = await this.schemaInformationService.getStockGroupList();
    return result;
  }

  @Get('/ware-house-list')
  async warehouse(): Promise<any> {
    const result = await this.schemaInformationService.getWarehouseList();
    return result;
  }
  @UseInterceptors(SchemaInfoResponseHandler)
  @Get('/customers')
  async customers(): Promise<any> {
    const result = await this.schemaInformationService.getCustomerList();
    return result;
  }
  @UseInterceptors(SchemaInfoResponseHandler)
  @Get('/salesmen')
  async salesmen(): Promise<any> {
    const result = await this.schemaInformationService.getSalesmanList();
    return result;
  }
}
