import { Controller, Get, Query } from '@nestjs/common';

import { ReportService } from './../services/report.service';
import { ReportName } from 'src/helper/enums/report-names.enum';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportService: ReportService) {}

  @Get('/cash-drawer')
  async cashdrawer(@Query() startDate: Date, @Query() endDate: Date): Promise<any> {
    const result = await this.reportService.generateReport(ReportName.CashDrawer, startDate, endDate);
    return result;
  }
}
