import { StockBalanceReport } from './../reports/stock-balance-report';

import { ReportName } from './../helper/enums/report-names.enum';
import { Injectable } from '@nestjs/common';

import { ReportStrategy } from '../interfaces-strategy/report-strategy';

import { CashDrawerReport } from '../reports/cash-drawer-report';
import { PriceListReport } from './../reports/price-list-report';
import { SalesReport } from '../reports/sales-report';
import { SalesAnalystReport } from '../reports/sales-analyst-report';
import { SalesAnalyst2Report } from './../reports/sales-analyst-2-report';
import { Sales2Report } from './../reports/sales-2-report';

@Injectable()
export class ReportFactory {
    constructor(
        private readonly cashDrawerReport: CashDrawerReport,
        private readonly priceListReport: PriceListReport,
        private readonly salesReport: SalesReport,
        private readonly salesAnalystReport: SalesAnalystReport,
        private readonly salesAnalyst2Report: SalesAnalyst2Report,
        private readonly sales2Report: Sales2Report,
        private readonly stockBalanceReport: StockBalanceReport
    ) {}

    getStrategy(reportType: string): ReportStrategy {
        switch (reportType) {
            case ReportName.CashDrawer:
                return this.cashDrawerReport;
                case ReportName.PriceList: 
                    return this.priceListReport;
            case ReportName.Sales:
                return this.salesReport;
            case ReportName.Sales_Analyst:
                return this.salesAnalystReport;
            case ReportName.Sales_Analyst2:
                return this.salesAnalyst2Report;
            case ReportName.Sales2:
                return this.sales2Report;
            case ReportName.Stock_Balance:
                return this.stockBalanceReport;
            default:
                throw new Error(`Report type '${reportType}' not supported`);
        }
    }
}
