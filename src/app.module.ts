// Nest Framework
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './module/auth.module';

// Controllers
import { ReportsController } from './controller/reports.controller';

// Services
import { ReportService } from './services/report.service';
import { GenericRepository } from './repository/generic.repository';
import { ReportFactory } from './factory/report-factory';
import { FormattingService } from './services/formatting.service';

// Reports
import { CashDrawerReport } from './reports/cash-drawer-report';
import { PriceListReport } from './reports/price-list-report';
import { SalesReport } from './reports/sales-report';
import { SalesAnalystReport } from './reports/sales-analyst-report';
import { SalesAnalyst2Report } from './reports/sales-analyst-2-report';
import { Sales2Report } from './reports/sales-2-report';
import { StockBalanceReport } from './reports/stock-balance-report';

const environment = process.env.NODE_ENV || 'development';
const config = require(`../ormconfig.${environment}.json`);

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...config,
    }),
    AuthModule,
  ],
  controllers: [ReportsController],
  providers: [
    ReportService,
    ReportFactory,
    FormattingService,
    GenericRepository,
    CashDrawerReport,
    PriceListReport,
    SalesReport,
    SalesAnalystReport,
    SalesAnalyst2Report,
    Sales2Report,
    StockBalanceReport
  ]
})
export class AppModule {}
