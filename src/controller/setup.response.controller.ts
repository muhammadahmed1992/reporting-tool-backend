import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { SetupResponseHandler } from 'src/interceptors/setup-response-handler.interceptor';
import { SetupResponseService } from 'src/services/setup.response.service';

// This controller is used to create the dropdown
// SetupResponseHandler maps the first column as key and second as value
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
  @Get('/stock-names')
  async getStockName(): Promise<any> {
    const response = await this.setupResponseService.getStockNameList();
    return response;
  }
}