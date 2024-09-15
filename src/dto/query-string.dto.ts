import { IsOptional, IsNumber, IsDateString, Min, IsArray } from 'class-validator';

export class QueryStringDTO {
  @IsNumber()
  @Min(1, { message: 'pageSize must be greater than 0' })
  pageSize: number;

  @IsNumber()
  @Min(1, { message: 'pageNumber must be greater than 0' })
  pageNumber: number;

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
}
