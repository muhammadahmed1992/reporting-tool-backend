import { Controller, Get, Query } from '@nestjs/common';

import { ReportService } from './../services/report.service';
import { ReportName } from 'src/helper/enums/report-names.enum';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportService: ReportService) {}

  @Get('/price-list')
  async pricelist(@Query('stockGroup') stockGroup: string): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.PriceList, stockGroup);
    return result;
  }
  @Get('/cash-drawer')
  async cashdrawer(@Query('startDate') startDate: Date, @Query('endDate') endDate: Date): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.CashDrawer, startDate, endDate);
    return result;
  }
  
  @Get('/sales')
  async sales(@Query('startDate') startDate: Date, @Query('endDate') endDate: Date, @Query('warehouse') warehouse: string): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Sales, startDate, endDate, warehouse);
    return result;
  }
  
  @Get('/sales-analyst')
  async salesanalyst(@Query('startDate') startDate: Date, 
                     @Query('endDate') endDate: Date, 
                    @Query('warehouse') warehouse: string, 
                    @Query('stockGroup') stockGroup: string): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Sales_Analyst, startDate, endDate, warehouse, stockGroup);
    return result;
  }
  
  @Get('/sales-analyst-2')
  async salesanalyst2(@Query('startDate') startDate: Date, 
  @Query('endDate') endDate: Date, 
 @Query('warehouse') warehouse: string, 
 @Query('stockGroup') stockGroup: string): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Sales_Analyst2, startDate, endDate, warehouse, stockGroup);
    return result;
  }
  
  @Get('/sales-2')
  async sales2(@Query('startDate') startDate: Date, @Query('endDate') endDate: Date, @Query('warehouse') warehouse: string): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Sales2, startDate, endDate, warehouse);
    return result;
  } 

  @Get('/stock-balance')
  async stockBalance(@Query('stockGroup') stockGroup: string, @Query('warehouse') warehouse: Date): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Stock_Balance, stockGroup, warehouse);
    return result;
  }

  @Get('/stock-search-barcode')
  async stockSearchBarCode(@Query('stockId') stockId: string): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Stock_Balance_BarCode, stockId);
    return result;
  }
  
  @Get('/purchase')
  async purchasing(@Query('startDate') startDate: Date, @Query('endDate') endDate: Date, @Query('warehouse') warehouse: string): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.PurchaseReport, startDate, endDate, warehouse);
    return result;
  }
  
  @Get('/purchase-analyst')
  async purchaseanalyst(@Query('startDate') startDate: Date, 
                     @Query('endDate') endDate: Date, 
                    @Query('warehouse') warehouse: string, 
                    @Query('stockGroup') stockGroup: string): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Purchasing_Analyst_Report, startDate, endDate, warehouse, stockGroup);
    return result;
  }
  
  @Get('/purchase-analyst-no-disc')
  async purchaseAnalystNoDisc(@Query('startDate') startDate: Date, 
  @Query('endDate') endDate: Date, 
 @Query('warehouse') warehouse: string, 
 @Query('stockGroup') stockGroup: string): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Purchasing_Analyst_Report_No_Disc, startDate, endDate, warehouse, stockGroup);
    return result;
  }
  
  @Get('/purchase-no-disc')
  async purcahseNoDisc(@Query('startDate') startDate: Date, @Query('endDate') endDate: Date, @Query('warehouse') warehouse: string): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.PurchasingReport_No_Disc, startDate, endDate, warehouse);
    return result;
  }
  
  @Get('/cash-drawer-detail')
  async cashDrawerDetails(@Query('startDate') startDate: Date, @Query('endDate') endDate: Date): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.CashDrawer_Detail, startDate, endDate);
    return result;
  }
}
