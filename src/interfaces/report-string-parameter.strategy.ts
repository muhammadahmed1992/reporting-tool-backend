export interface StringParameterReportStrategy {
    generateReport(filterValue: string): Promise<any>;
}