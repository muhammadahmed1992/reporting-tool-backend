import { Injectable, Scope } from '@nestjs/common';
import { ReportFactory } from './../factory/report-factory';
import ApiResponse from 'src/helper/api-response';

@Injectable({ scope: Scope.REQUEST })
export class ReportService {
    constructor(private readonly reportFactory: ReportFactory) {}

    async generateReport(reportType: string, ...params: any): Promise<ApiResponse<any>> {
        const strategy = this.reportFactory.getStrategy(reportType);
        return strategy.generateReport(...params);
    }
}
