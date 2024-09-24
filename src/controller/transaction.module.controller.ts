import { Controller, Get, Query } from '@nestjs/common';
import { TransactionModuleService } from 'src/services/transaction.module.service';

@Controller('/transactions')
export  class  TransactionModuleController {
    constructor(private readonly transactionModuleService: TransactionModuleService) {}
    @Get('/sales')
    async sales() {
        const response = await this.transactionModuleService.sales();
        return response;
    } 
}