// Nest Framework
import { DynamicModule, MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './module/auth.module';

// Controllers
import { ReportsController } from './controller/reports.controller';

// Services
import { ReportService } from './services/report.service';
import { GenericRepository } from './repository/generic.repository';
import { ReportFactory } from './factory/report-factory';

// Reports
import { CashDrawerReport } from './reports/cash-drawer-report';
import { PriceListReport } from './reports/price-list-report';
import { SalesReport } from './reports/sales-report';
import { SalesAnalystReport } from './reports/sales-analyst-report';
import { SalesAnalyst2Report } from './reports/sales-analyst-2-report';
import { Sales2Report } from './reports/sales-2-report';
import { StockBalanceReport } from './reports/stock-balance-report';
import { ConnectionStringMiddleware } from './middleware/connection-string.middleware';
import { REQUEST } from '@nestjs/core';
import { SearchStockIDReport } from './reports/search-stockid-report';
import { SchemaInfoController } from './controller/database.schema.controller';
import { SchemaInformationService } from './services/schema.information.service';
import { HeartBeatController } from './controller/heart.beat.controller';
import { Andriod2Controller } from './auth/controller/andriod2.controller';
import { PurchaseReport } from './reports/purchasing-report';
import { PurchaseReportNoDisc } from './reports/purchasing-report-no-disc';
import { PurchaseAnalystReport } from './reports/purchasing-analyst-report';
import { PurchaseAnalystReportNoDisc } from './reports/purchasing-analyst-report-no-disc';
import { CashDrawerDetailReport } from './reports/cash-drawer-detail-report';
import { LocalizationService } from './services/localization.service';
import { LocalizationController } from './controller/translate.controller';

@Module({
  imports: [
    AuthModule,
  ],
  controllers: [ReportsController, SchemaInfoController, HeartBeatController, LocalizationController],
  providers: [
    LocalizationService,
    ReportService,
    SchemaInformationService,
    ReportFactory,
    GenericRepository,
    CashDrawerReport,
    PriceListReport,
    SalesReport,
    SalesAnalystReport,
    SalesAnalyst2Report,
    Sales2Report,
    StockBalanceReport,
    SearchStockIDReport,
    PurchaseReport,
    PurchaseReportNoDisc,
    PurchaseAnalystReport,
    PurchaseAnalystReportNoDisc,
    CashDrawerDetailReport
  ]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ConnectionStringMiddleware)
      .forRoutes(
        Andriod2Controller, SchemaInfoController, ReportsController
      );
  }
}
