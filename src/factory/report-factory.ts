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
import { SearchStockID_Purchase_Price_Report } from 'src/reports/search-stockid-purchase-price-report';

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
        private readonly cashDrawerDetailReport: CashDrawerDetailReport,
        private readonly stockBalancePurchasePriceReport: SearchStockID_Purchase_Price_Report
    ) {}

    getStrategy(reportType: string): ReportStrategy {
        switch (reportType) {
            case ReportName.Cash_Drawer:
                return this.cashDrawerReport;
            case ReportName.Price_List:
                    return this.priceListReport;
            case ReportName.Sales:
                return this.salesReport;
            case ReportName.Sales_Analyst:
                return this.salesAnalystReport;
            case ReportName.Sales_Analyst_No_Disc:
                return this.salesAnalyst2Report;
            case ReportName.Sales_No_Disc:
                return this.sales2Report;
            case ReportName.Stock_Balance:
                return this.stockBalanceReport;
            case ReportName.Stock_Balance_BarCode:
                return this.stockBalanceBarCodeReport;
            case ReportName.Purchase_Report:
                return this.purchaseReport;
            case ReportName.Purchase_Report_No_Disc:
                return this.purchaseReportNoDisc;
            case ReportName.Purchase_Analyst_Report: 
                return this.purchaseAnaylystReport;
            case ReportName.Purchase_Analyst_Report_No_Disc:
                return this.purchaseAnalystReportNoDisc;
            case ReportName.Cash_Drawer_Detail:
                return this.cashDrawerDetailReport;
            case ReportName.Stock_Balance_BarCode_Purchase_Price:
                return this.stockBalancePurchasePriceReport;
            default:
                throw new Error(`Report type '${reportType}' not supported`);
        }
    }
}
