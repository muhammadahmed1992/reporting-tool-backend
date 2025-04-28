import { Injectable } from '@nestjs/common';
import { generateReceipt } from '../utils/receipt-formatter';

@Injectable()
export class ReceiptService {
  generate(data: any): string {
    return generateReceipt(data);
  }
}
