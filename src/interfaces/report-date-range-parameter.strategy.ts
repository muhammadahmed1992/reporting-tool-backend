export interface DateRangeReportStrategy {
    generateReport(startDate: Date, endDate: Date): Promise<any>;
}