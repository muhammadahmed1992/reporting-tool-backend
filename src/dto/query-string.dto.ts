import { IsOptional, IsNumber, IsDateString, Min, IsArray } from 'class-validator';

export class QueryStringDTO {
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

  @IsOptional()
  searchValue?: string;

  @IsOptional()
  columnsToFilter?: string[];

  @IsOptional()
  sortColumn?: string;

  @IsOptional()
  sortDirection?: 'desc' | 'asc';
}