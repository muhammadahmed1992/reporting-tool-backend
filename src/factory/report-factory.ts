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
import { SearchStockIDReport } from 'src/reports/search-stockid-report';
import { PurchaseReport } from 'src/reports/purchasing-report';
import { PurchaseReportNoDisc } from 'src/reports/purchasing-report-no-disc';
import { PurchaseAnalystReport } from 'src/reports/purchasing-analyst-report';
import { PurchaseAnalystReportNoDisc } from 'src/reports/purchasing-analyst-report-no-disc';
import { CashDrawerDetailReport } from 'src/reports/cash-drawer-detail-report';

@Injectable()
export class ReportFactory {
    constructor(
        private readonly cashDrawerReport: CashDrawerReport,
        private readonly priceListReport: PriceListReport,
        private readonly salesReport: SalesReport,
        private readonly salesAnalystReport: SalesAnalystReport,
        private readonly salesAnalyst2Report: SalesAnalyst2Report,
        private readonly sales2Report: Sales2Report,
        private readonly stockBalanceReport: StockBalanceReport,
        private readonly stockBalanceBarCodeReport: SearchStockIDReport,
        private readonly purchaseReport: PurchaseReport,
        private readonly purchaseReportNoDisc: PurchaseReportNoDisc,
        private readonly purchaseAnaylystReport: PurchaseAnalystReport,
        private readonly purchaseAnalystReportNoDisc: PurchaseAnalystReportNoDisc,
        private readonly cashDrawerDetailReport: CashDrawerDetailReport
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
            case ReportName.Stock_Balance_BarCode:
                return this.stockBalanceBarCodeReport;
            case ReportName.PurchaseReport:
                return this.purchaseReport;
            case ReportName.PurchasingReport_No_Disc:
                return this.purchaseReportNoDisc;
            case ReportName.Purchasing_Analyst_Report: 
                return this.purchaseAnaylystReport;
            case ReportName.Purchasing_Analyst_Report_No_Disc:
                return this.purchaseAnalystReportNoDisc;
            case ReportName.CashDrawer_Detail:
                return this.cashDrawerDetailReport;
            default:
                throw new Error(`Report type '${reportType}' not supported`);
        }
    }
}
