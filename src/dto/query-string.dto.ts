import { IsOptional, IsNumberString, IsDateString } from 'class-validator';

export class QueryStringDTO {
  @IsOptional()
  pageSize?: number;

  @IsOptional()
  pageNumber?: number;

  @IsOptional()
  stockCode?: string;

  @IsOptional()
  stockGroup?: string;

  @IsOptional()
  warehouse?: string;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;
}
