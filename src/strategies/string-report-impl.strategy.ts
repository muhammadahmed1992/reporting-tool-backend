import { Injectable } from '@nestjs/common';
import { StringParameterReportStrategy } from '../interfaces/report-string-parameter.strategy';

@Injectable()
export class StringParameterReportStrategyImpl implements StringParameterReportStrategy {

    public async generateReport(filterValue: string): Promise<any> {
        return null;
    }

    // async generateReport(reportName: string, startDate: Date, endDate: Date): Promise<any> {
    //     const query = `
    //         SELECT * FROM your_table
    //         WHERE date_column BETWEEN ? AND ?
    //     `;
    //     const results = await getConnection().query(query, [startDate, endDate]);
    //     return results;
    // }
}