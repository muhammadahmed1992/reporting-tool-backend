import { Controller, Get, Query, Post, Body, Param } from '@nestjs/common';
import { TransactionModuleService } from 'src/services/transaction.module.service';
import { TransactionSalesInvoiceDTO } from 'src/dto/transaction-sales-invoice.dto';

@Controller('/transactions')
export class TransactionModuleController {
  constructor(
    private readonly transactionModuleService: TransactionModuleService,
  ) {}
  @Get('/:user/sales')
  async sales(@Param('user') loggedInUser: string) {
    console.log(loggedInUser);
    const response =
      await this.transactionModuleService.salesInvoice(loggedInUser);
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

  @Get('/:user/sales-order')
  async salesOrder(@Param('user') loggedInUser: string) {
    console.log(loggedInUser);
    const response =
      await this.transactionModuleService.salesOrderInvoice(loggedInUser);
    return response;
  }

  @Get('/sales-order-table')
  async salesOrderTable(@Query() stockId: string) {
    const response = await this.transactionModuleService.salesOrderTable(stockId);
    return response;
  }

  @Post('/sales-order')
  async insertOrderInvoiceData(@Body() body: TransactionSalesInvoiceDTO) {
    const response = await this.transactionModuleService.setSalesOrderInvoice(body);
    return response;
  }

  @Get('/:user/pos')
  async posInvoice(@Param('user') loggedInUser: string) {
    console.log(loggedInUser);
    const response =
      await this.transactionModuleService.posInvoice(loggedInUser);
    return response;
  }

  @Get('/pos-table')
  async posTable(@Query() stockId: string) {
    const response = await this.transactionModuleService.posTable(stockId);
    return response;
  }

  @Post('/pos')
  async insertPosInvoiceData(@Body() body: TransactionSalesInvoiceDTO) {
    const response = await this.transactionModuleService.setPosInvoice(body);
    return response;
  }

  @Get('/:user/stock')
  async stockInvoice(@Param('user') loggedInUser: string) {
    console.log(loggedInUser);
    const response =
      await this.transactionModuleService.stockInvoice(loggedInUser);
    return response;
  }

  @Get('/stock-table')
  async stockTable(@Query() stockId: string) {
    const response = await this.transactionModuleService.stockTable(stockId);
    return response;
  }

  @Post('/stock')
  async insertStockInvoiceData(@Body() body: any) {
    const response = await this.transactionModuleService.setStockInvoice(body);
    return response;
  }

}
