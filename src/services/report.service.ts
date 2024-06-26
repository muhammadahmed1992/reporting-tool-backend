import { Injectable } from '@nestjs/common';
import { ReportFactory } from './../factory/report-factory';
import { isDateRangeReportStrategy, isStringParameterReportStrategy } from '../helper/strategy-checker.helper';

@Injectable()
export class ReportService {
    constructor(private readonly reportFactory: ReportFactory) {}

    async generateReport(reportType: string, ...params: any): Promise<any> {
        const strategy = this.reportFactory.getStrategy(reportType);
        if (isDateRangeReportStrategy(strategy)) {
            const [startDate, endDate] = params;
            return strategy.generateReport(startDate.startDate, endDate.endDate);
        } else if (isStringParameterReportStrategy(strategy)) {
            const [param] = params;
            return strategy.generateReport(param);
        } else {
            throw new Error('Unknown report strategy type');
        }
    }
}
