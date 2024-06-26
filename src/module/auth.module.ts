import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Andriod2Controller } from '../auth/controller/andriod2.controller';
import { Andriod2Service } from '../auth/service/andriod2.service';
import { GenericRepository } from '../repository/generic.repository';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [Andriod2Controller],
  providers: [Andriod2Service, GenericRepository],
})
export class AuthModule {}
