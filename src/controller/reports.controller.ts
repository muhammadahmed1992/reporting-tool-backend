import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ReportService } from './../services/report.service';
import { ReportName } from 'src/helper/enums/report-names.enum';
import { QueryStringDTO } from 'src/dto/query-string.dto';
import { DateInterceptor } from 'src/interceptors/date.interceptor';

@Controller('reports')
@UseInterceptors(DateInterceptor)
export class ReportsController {
  constructor(private readonly reportService: ReportService) {}

  @Get('/price-list')
  async pricelist(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Price_List, query);
    return result;
  }
  @Get('/cash-drawer')
  async cashdrawer(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Cash_Drawer, query);
    return result;
  }
  
  @Get('/sales')
  async sales(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Sales, query);
    return result;
  }
  
  @Get('/sales-analyst')
  async salesanalyst(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Sales_Analyst, query);
    return result;
  }
  
  @Get('/sales-analyst-2')
  async salesanalyst2(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Sales_Analyst_No_Disc, query);
    return result;
  }
  
  @Get('/sales-2')
  async sales2(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Sales_No_Disc, query);
    return result;
  } 

  @Get('/stock-balance')
  async stockBalance(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Stock_Balance, query);
    return result;
  }

  @Get('/stock-search-barcode')
  async stockSearchBarCode(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Stock_Balance_BarCode, query);
    return result;
  }
  
  @Get('/purchase')
  async purchasing(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Purchase_Report, query);
    return result;
  }
  
  @Get('/purchase-analyst')
  async purchaseanalyst(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Purchase_Analyst_Report, query);
    return result;
  }
  
  @Get('/purchase-analyst-no-disc')
  async purchaseAnalystNoDisc(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Purchase_Analyst_Report_No_Disc, query);
    return result;
  }
  
  @Get('/purchase-no-disc')
  async purcahseNoDisc(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Purchase_Report_No_Disc, query);
    return result;
  }
  
  @Get('/cash-drawer-detail')
  async cashDrawerDetails(@Query() query: QueryStringDTO): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.Cash_Drawer_Detail, query);
    return result;
  }
}