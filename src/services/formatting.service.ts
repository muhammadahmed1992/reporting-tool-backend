import { Injectable } from '@nestjs/common';

@Injectable()
export class FormattingService {
  formatQuantity(value: number): string {
    return this.formatNumber(value, 0);
  }

  formatBalance(value: number): string {
    return this.formatNumber(value, 0);
  }

  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  private formatNumber(value: number, decimalPlaces: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  }
}
