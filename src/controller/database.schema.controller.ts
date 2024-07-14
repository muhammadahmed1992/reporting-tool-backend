import { Controller, Get } from '@nestjs/common';
import { SchemaInformationService } from 'src/services/schema.information.service';

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
}
