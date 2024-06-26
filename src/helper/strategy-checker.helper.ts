import { DateRangeReportStrategy } from '../interfaces/report-date-range-parameter.strategy'
import { StringParameterReportStrategy } from '../interfaces/report-string-parameter.strategy';

export function isDateRangeReportStrategy(strategy: any): strategy is DateRangeReportStrategy {
    return (strategy as DateRangeReportStrategy).generateReport !== undefined;
}

export function isStringParameterReportStrategy(strategy: any): strategy is StringParameterReportStrategy {
    return (strategy as StringParameterReportStrategy).generateReport !== undefined;
}


