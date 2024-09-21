import { IsOptional } from 'class-validator';

export class QueryStringDTO {
  @IsOptional()
  stockId?: string;

  @IsOptional()
  stockGroup?: string;

  @IsOptional()
  warehouse?: string;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;

  @IsOptional()
  searchValue?: string;

  @IsOptional()
  columnsToFilter?: string[];

  @IsOptional()
  sortColumn?: string;

  @IsOptional()
  sortDirection?: 'desc' | 'asc';
}