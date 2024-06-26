import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './module/auth.module';

import { GenericRepository } from './repository/generic.repository';
import { ReportService } from './services/report.service';
import { ReportFactory } from './factory/report-factory';
import { CashDrawerReportStrategy } from './strategies/cash-drawer-report.strategy';
import { ReportsController } from './controller/reports.controller';


const environment = process.env.NODE_ENV || 'development';
const config = require(`../ormconfig.${environment}.json`);
console.log(config);
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
    CashDrawerReportStrategy,
    GenericRepository
  ]
})
export class AppModule {}
