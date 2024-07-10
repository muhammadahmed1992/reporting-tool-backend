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
}
