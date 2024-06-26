export interface ReportStrategy {
    generateReport(...params: any): Promise<any>;
}