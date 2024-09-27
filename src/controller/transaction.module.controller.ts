import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { TransactionModuleService } from 'src/services/transaction.module.service';
import { TransactionSalesInvoiceDTO } from 'src/dto/transaction-sales-invoice.dto';

@Controller('/transactions')
export  class  TransactionModuleController {
    constructor(private readonly transactionModuleService: TransactionModuleService) {}
    @Get('/sales')
    async sales(@Query() loggedInUser?: string) {
        const response = await this.transactionModuleService.salesInvoice(loggedInUser);
        return response;
    } 
    @Get('/sales-table')
    async salesTable(@Query() stockId: string) {
        const response = await this.transactionModuleService.salesTable(stockId);
        return response;
    }
    @Post('/sales')
  async insertInvoiceData(@Body() body: TransactionSalesInvoiceDTO) {
    const response = await this.transactionModuleService.setSalesInvoice(body);
    return response;
  }
}