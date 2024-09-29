import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { SetupResponseHandler } from 'src/interceptors/setup-response-handler.interceptor';
import { SetupResponseService } from 'src/services/setup.response.service';

@Controller('setup')
@UseInterceptors(SetupResponseHandler)
export class SetupResponseController {
    constructor(private readonly setupResponseService: SetupResponseService) {}
  @Get('/customers')
  async customers(): Promise<any> {
    const result = await this.setupResponseService.getCustomerList();
    return result;
  }
  @Get('/salesmen')
  async salesmen(): Promise<any> {
    const result = await this.setupResponseService.getSalesmanList();
    return result;
  }
}