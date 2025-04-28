import { Controller, Get } from '@nestjs/common';
import { ReceiptService } from '../services/receipt.service';
import ResponseHelper from 'src/helper/response-helper';

@Controller('receipt')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Get()
  generateReceipt() {
    const body = {
        "dateTime": "20-04-2025 10:20 bos",
        "items": [
          { "name": "Fish Taco", "qty": 1, "price": 25000, "total": 25000 },
          { "name": "BLT Sandwich", "qty": 2, "price": 20000, "total": 40000 },
          { "name": "Hamburger Plate", "qty": 3, "price": 25000, "total": 75000 }
        ],
        "subtotal": 140000,
        "tax": 14000,
        "service": 14000,
        "total": 168000,
        "cash": 200000,
        "change": 32000,
        "receiptNo": 100001,
        "type": "Dine In",
        "pax": 1
      };
      
    const receiptText = this.receiptService.generate(body);
    console.log(receiptText);
    return ResponseHelper.CreateResponse<string>(receiptText);
  }
}
