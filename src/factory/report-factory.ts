import { ReportName } from './../helper/enums/report-names.enum';
import { Injectable } from '@nestjs/common';

import { DateRangeReportStrategy } from './../interfaces/report-date-range-parameter.strategy';
import { StringParameterReportStrategy } from './../interfaces/report-string-parameter.strategy';

import { CashDrawerReportStrategy } from '../strategies/cash-drawer-report.strategy';
import { StringParameterReportStrategyImpl } from '../strategies/string-report-impl.strategy';

@Injectable()
export class ReportFactory {
    constructor(
        private readonly cashDrawerReportStrategy: CashDrawerReportStrategy
    ) {}

    getStrategy(reportType: string): DateRangeReportStrategy | StringParameterReportStrategy {
        switch (reportType) {
            case ReportName.CashDrawer:
                return this.cashDrawerReportStrategy;
            default:
                throw new Error(`Report type '${reportType}' not supported`);
        }
    }
}
