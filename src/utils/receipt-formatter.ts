import { Injectable } from "@nestjs/common";
import { LocaleService } from "src/services/locale.service";
import { LocalizationService } from "src/services/localization.service";

type StockAdjustment = {
  cinvrefno: string;
  oleh: string;
  cstkdesc: string;
  qty: number;
  civdunit: string;
  cwhsdesc: string;
};

@Injectable()
export class ReceiptFormatter {
  constructor(
    private readonly localizationService: LocalizationService,
    private readonly localeService: LocaleService
  ) {
  }
  private static ReceiptDistance: string = '\n\n';
  private static LineHeight: string = '\n';
  private RECEIPT_WIDTH = 32;
  private EQUALS_COL = 19;
  private translations: Record<string, string>;

  public setWidth(width: number) {
    this.RECEIPT_WIDTH = width;
    //Setting Equal sign value according to the printer width: which is the 62.5% of printer width:
    return this;
  }

  async stockAdjustment(invoiceDetails: StockAdjustment[]): Promise<string> {
    if (!invoiceDetails.length) return '';
    await this.setTranslations();
    const first = invoiceDetails[0];
    const metadata = `${this.centerAlign(first.oleh)}\n\n`;

    let items = '';
    for (const detail of invoiceDetails) {
      const name = detail.cstkdesc.trim();
      const qty = String(detail.qty);
      const unit = detail.civdunit;
      items += `${ReceiptFormatter.formatStockItemLine(name, qty, unit, this.RECEIPT_WIDTH)}${ReceiptFormatter.LineHeight}`;
    }

    const receiptNo = `${ReceiptFormatter.LineHeight}   ${this.translations['receipt_label']}: ${first.cinvrefno}`;
    const location = `${ReceiptFormatter.LineHeight}   ${first.cwhsdesc.trim()}${ReceiptFormatter.ReceiptDistance}`;

    return `${metadata}${items}${receiptNo}${location}`;
  }

  async salesOrder(masterData: any, detailData: any): Promise<string> {
    try {
      if (!masterData || (Array.isArray(detailData) && detailData?.length === 0)) return '';

      await this.setTranslations();

      const firstRow = masterData[0];
      const {
        cinvrefno, oleh, pheader, pfooter, ninvvalue, total_item, cinvfkentcode, csamdesc, cwhsdesc
        , total_qty, subtotal, tax
      } = firstRow;

      const items: any[] = detailData.map(row => ({
        cstkdesc: row.cstkdesc.trim(),
        qty: row.qty,
        civdunit: row.civdunit.trim(),
        price: row.price,
        amount: row.amount,
      }));
      const lines: string[] = [];

      lines.push(this.centerMultilineText(pheader.trim()));

      // Adding Multiple new lines before printing the date time.
      lines.push(ReceiptFormatter.ReceiptDistance);
      lines.push(this.centerAlign(`${oleh}`));
      lines.push(this.centerAlign(`* ${this.translations['sales_order_label']} *`));

      let maxAmount = items[0].amount;
      for (const item of items) {

        // Line 1: Item name with 3 leading spaces
        lines.push(this.formatItemNameLine(item.cstkdesc.trim()));

        // Line 2: Qty, unit, unit price, and total amount (right-aligned)
        lines.push(this.formatItemDetailsLine(item.qty, item.civdunit, item.price, item.amount));

        if (item.amount > maxAmount)
          maxAmount = item.amount;

      }
      // Add dashed line under the equals sign
      lines.push(this.formatDashedLine(maxAmount));
      // Summary

      lines.push(this.formatSummaryLine(`  ${this.translations['subtotal_rp_label']}`, subtotal));
      if (tax > 0) {
        lines.push(this.formatSummaryLine(`  ${this.translations['tax_label']}`, tax));
      }

      // Add dashed line under the equals sign
      lines.push(this.formatDashedLine(subtotal));

      lines.push(this.formatSummaryLine(this.translations['total_label'], ninvvalue));
      // Add dashed line under the equals sign
      lines.push(this.formatDashedLine(ninvvalue));

      lines.push(this.formatItemNameLine(`${this.translations['total_qty_label']} = ${total_qty} (${total_item} ${this.translations["items_label"]})`));

      lines.push(`   ${this.translations["receipt_label"]}     : ${cinvrefno}`);
      lines.push(`   ${this.translations["member_label"]}      : ${cinvfkentcode?.trim()}`);
      lines.push(`   ${this.translations["waiter_label"]}      : ${csamdesc?.trim()}`);
      lines.push(`   ${this.translations["location_label"]}    : ${cwhsdesc?.trim()}`);
      lines.push(this.centerMultilineText(pfooter.trim()));
      lines.push('');
      lines.push('');
      lines.push(this.centerAlign(`.`.repeat(this.RECEIPT_WIDTH - 2)));
      lines.push(ReceiptFormatter.ReceiptDistance);
      return (lines.join(ReceiptFormatter.LineHeight) + ReceiptFormatter.ReceiptDistance);
    } catch (e) {
      console.log('error while generating receipt: sales order');
      console.log(e);
      return '';
    }
  }

  async pointOfSales(masterData: any, detailData: any): Promise<string> {

    if (!masterData || (Array.isArray(detailData) && detailData?.length === 0)) return '';

    const firstRow = masterData[0];
    const {
      pheader, pfooter, cinvmeja, cinvrefno, ninvvalue,
      ninvtunai_ninvkembali, ninvfreight, tax, subtotal,
      total_item, total_qty, oleh, ninvvoucher, ninvdebit, ninvcredit, ninvmobile, ninvkembali
    } = firstRow;

    const items: any[] = detailData.map(row => ({
      cstkdesc: row.cstkdesc.trim(),
      qty: row.qty,
      civdunit: row.civdunit.trim(),
      price: row.price,
      amount: row.amount,
    }));

    await this.setTranslations();
    const lines: string[] = [];
    lines.push(this.centerMultilineText(pheader.trim()));
    lines.push(this.centerAlign(`${oleh}`));
    // Adding Multiple new lines before printing the date time...
    lines.push(ReceiptFormatter.ReceiptDistance);

    if (cinvmeja) {
      lines.push(` Table: ${cinvmeja}`);
      lines.push(`--------${'-'.repeat(cinvmeja.length)}`);
    }

    // Items
    let maxAmount = items[0].amount;
    for (const item of items) {
      // Line 1: Item name with 3 leading spaces
      lines.push(this.formatItemNameLine(item.cstkdesc.trim()));

      // Line 2: Qty, unit, unit price, and total amount (right-aligned)
      lines.push(this.formatItemDetailsLine(item.qty, item.civdunit, item.price, item.amount));

      if (item.amount > maxAmount)
        maxAmount = item.amount;
    }

    // Add dashed line under the equals sign
    lines.push(this.formatDashedLine(maxAmount));
    // Summary

    lines.push(this.formatSummaryLine(`  ${this.translations['subtotal_rp_label']}`, subtotal));

    if (this.toNumber(tax) > 0) {
      lines.push(this.formatSummaryLine(`  ${this.translations['tax_label']}`, tax));
    }
    if (this.toNumber(ninvfreight) > 0) {
      lines.push(this.formatSummaryLine(`  ${this.translations['service_label']}`, ninvfreight));
    }

    // Add dashed line under the equals sign
    lines.push(this.formatDashedLine(this.getMaxWithFormattedOriginal([subtotal, tax, ninvfreight]).original));

    lines.push(this.formatSummaryLine(`  ${this.translations['total_label']}`, ninvvalue));

    if (this.toNumber(ninvvoucher) > 0) {
      lines.push(this.formatSummaryLine(`  ${this.translations['voucher_label']}`, ninvvoucher));
    }
    if (this.toNumber(ninvtunai_ninvkembali) > 0) {
      lines.push(this.formatSummaryLine(`  ${this.translations['cash_label']}`, ninvtunai_ninvkembali));
    }
    if (this.toNumber(ninvdebit) > 0) {
      lines.push(this.formatSummaryLine(`  ${this.translations['debit_label']}`, ninvdebit));
    }
    if (this.toNumber(ninvcredit) > 0) {
      lines.push(this.formatSummaryLine(`  ${this.translations['credit_label']}`, ninvcredit));
    }
    if (this.toNumber(ninvmobile) > 0) {
      lines.push(this.formatSummaryLine(`  ${this.translations['mobile_label']}`, ninvmobile));
    }

    const result = this.getMaxWithFormattedOriginal([ninvvalue, ninvvoucher, ninvtunai_ninvkembali, ninvdebit, ninvcredit, ninvmobile]).original;

    // Add dashed line under the equals sign
    lines.push(this.formatDashedLine(result));
    if (ninvkembali > 0) {
      lines.push(this.formatSummaryLine(`  ${this.translations['change_label']}`, ninvkembali));
    }
    lines.push(this.formatItemNameLine(`${this.translations['total_qty_label']} = ${total_qty}(${total_item} ${this.translations["items_label"]})`));
    lines.push(`   ${this.translations["receipt_label"]}     : ${cinvrefno}`);
    lines.push('');
    lines.push('');
    lines.push(this.centerMultilineText(pfooter.trim()));
    lines.push('');
    lines.push('');
    lines.push(this.centerAlign(`.`.repeat(this.RECEIPT_WIDTH - 2)));
    lines.push(ReceiptFormatter.ReceiptDistance);
    return (lines.join(ReceiptFormatter.LineHeight) + ReceiptFormatter.ReceiptDistance);
  }

  async sales(masterData: any, detailData: any): Promise<string> {
    try {

      if (!masterData || (Array.isArray(detailData) && detailData?.length === 0)) return '';

      await this.setTranslations();

      const firstRow = masterData[0];
      const {
        cinvrefno, oleh, pheader, pfooter, ninvvalue, total_item, cinvfkentcode, csamdesc, cwhsdesc
        , total_qty, subtotal, tax, ninvtunai_ninvkembali
      } = firstRow;

      const items: any[] = detailData.map(row => ({
        cstkdesc: row.cstkdesc.trim(),
        qty: row.qty,
        civdunit: row.civdunit.trim(),
        price: row.price,
        amount: row.amount,
      }));
      const lines: string[] = [];

      lines.push(this.centerMultilineText(pheader.trim()));

      // Adding Multiple new lines before printing the date time.
      lines.push(ReceiptFormatter.ReceiptDistance);
      lines.push(this.centerAlign(`${oleh}`));
      lines.push(this.centerAlign(`* ${this.translations['sales_label']} * `));

      let maxAmount = items[0].amount;
      for (const item of items) {

        // Line 1: Item name with 3 leading spaces
        lines.push(this.formatItemNameLine(item.cstkdesc.trim()));

        // Line 2: Qty, unit, unit price, and total amount (right-aligned)
        lines.push(this.formatItemDetailsLine(item.qty, item.civdunit, item.price, item.amount));

        if (item.amount > maxAmount)
          maxAmount = item.amount;

      }
      // Add dashed line under the equals sign
      lines.push(this.formatDashedLine(maxAmount));
      // Summary

      lines.push(this.formatSummaryLine(`  ${this.translations['subtotal_rp_label']}`, subtotal));
      if (this.toNumber(tax) > 0) {
        lines.push(this.formatSummaryLine(`  ${this.translations['tax_label']}`, tax));
      }

      // Add dashed line under the equals sign
      lines.push(this.formatDashedLine(subtotal));

      lines.push(this.formatSummaryLine(this.translations['total_label'], ninvvalue));
      // Add dashed line under the equals sign
      lines.push(this.formatDashedLine(ninvvalue));

      lines.push(this.formatItemNameLine(`${this.translations['total_qty_label']} = ${total_qty}(${total_item} ${this.translations["items_label"]})`));

      lines.push(`   ${this.translations["receipt_label"]}     : ${cinvrefno}`);
      lines.push(`   ${this.translations["member_label"]}      : ${cinvfkentcode?.trim()}`);
      lines.push(`   ${this.translations["waiter_label"]}      : ${csamdesc?.trim()}`);
      lines.push(`   ${this.translations["location_label"]}    : ${cwhsdesc?.trim()}`);
      lines.push(this.centerMultilineText(pfooter.trim()));
      lines.push('');
      lines.push('');
      lines.push(this.centerAlign(`.`.repeat(this.RECEIPT_WIDTH - 2)));
      lines.push(ReceiptFormatter.ReceiptDistance);
      return (lines.join(ReceiptFormatter.LineHeight) + ReceiptFormatter.ReceiptDistance);
    } catch (e) {
      console.log('error while generating receipt: sales');
      console.log(e);
      return '';
    }
  }

  private async setTranslations() {
    this.translations = await this.localizationService.getTranslations(this.localeService.getLocale(), 'backend');
  }

  private centerAlign(text: string): string {
    const cleanText = text.trim();
    const spaces = Math.max(0, Math.floor((this.RECEIPT_WIDTH - cleanText.length) / 2));
    return ' '.repeat(spaces) + cleanText;
  }

  private static formatStockItemLine(itemName, qty, unit, LINE_WIDTH: number = 32, paddingLeft = 0) {
    const qtyUnit = `${qty} ${unit.trim()}`; // e.g., "1 Pcs"
    const leftPaddedName = ' '.repeat(paddingLeft) + itemName.trim();

    const maxNameLength = LINE_WIDTH - qtyUnit.length - paddingLeft;

    // Truncate name if too long
    const namePart = leftPaddedName.length > maxNameLength + paddingLeft
      ? leftPaddedName.slice(0, maxNameLength + paddingLeft)
      : leftPaddedName;

    const space = LINE_WIDTH - namePart.length - qtyUnit.length;
    const line = namePart + ' '.repeat(space) + qtyUnit;

    return line;
  }

  private centerMultilineText(text: string): string {
    return text
      .split(/\r?\n/)
      .map(line => {
        const trimmed = line.trim();
        const padding = Math.max(0, Math.floor((this.RECEIPT_WIDTH - trimmed.length) / 2));
        return ' '.repeat(padding) + trimmed;
      })
      .join('\n');
  }

  private pad(str: string, len: number, align: 'left' | 'right' = 'left'): string {
    if (str.length > len) return str.slice(0, len);
    const padding = ' '.repeat(len - str.length);
    return align === 'right' ? padding + str : str + padding;
  }


  // Pads or trims a string to a fixed length
  private padOrTrim(text: string, length: number, align: 'left' | 'right' = 'right'): string {
    if (text.length > length) return text.slice(0, length);
    return align === 'right' ? text.padStart(length, ' ') : text.padEnd(length, ' ');
  }

  // Just the item name (on its own line)
  private formatItemNameLine(name: string): string {
    const leftPadding = ' '.repeat(0); // 3 spaces
    const contentWidth = this.RECEIPT_WIDTH;
    const paddedName = name.padEnd(contentWidth); // or padStart if you want right alignment
    return leftPadding + paddedName;
  }

  private formatItemDetailsLine(
    qty: number,
    unit: string,
    price: number,
    total: number
  ): string {

    // Define proportions based on original 58mm printer
    const totalProportion = this.RECEIPT_WIDTH;
    const qtyUnitProportion = 9;
    const priceProportion = 9;
    const totalProportionLength = 10;

    // Calculate actual widths proportionally
    const qtyUnitWidth = Math.floor((qtyUnitProportion / totalProportion) * this.RECEIPT_WIDTH);
    const priceWidth = Math.floor((priceProportion / totalProportion) * this.RECEIPT_WIDTH);
    const totalWidth = Math.floor((totalProportionLength / totalProportion) * this.RECEIPT_WIDTH);

    const equalsStr = ' = ';

    const qtyUnit = `${qty} ${unit}`;
    const qtyUnitPadded = this.padOrTrim(qtyUnit, qtyUnitWidth, 'left');

    const priceStr = price.toString();
    const pricePadded = this.padOrTrim(priceStr, priceWidth, 'right');

    const totalStr = total.toString();
    const totalPadded = this.padOrTrim(totalStr, totalWidth, 'right');
    return `${qtyUnitPadded}${pricePadded}${equalsStr}${totalPadded}`;
  }

  // For subtotal, total etc: "Subtotal Rp. =     70,000"
  private formatSummaryLine(label: string, amount: string): string {
    // Calculate the proportional equals column
    const equalsCol = Math.floor((this.RECEIPT_WIDTH * this.EQUALS_COL) / this.RECEIPT_WIDTH);

    const left = `${this.pad(label, equalsCol - 1, 'right')} `; // leave space before '='
    const equals = '=';
    const right = `${this.pad(amount, this.RECEIPT_WIDTH - equalsCol - 1, 'right')}`;

    return left + equals + right;
  }

  // Dashes under the '=' column
  private formatDashedLine(amount?: string): string {
    // Calculate the proportional equals column
    const start = Math.floor((this.RECEIPT_WIDTH * this.EQUALS_COL) / this.RECEIPT_WIDTH);
    // let length = ((this.RECEIPT_WIDTH - start)) + amount.length; // for space after '='
    // if (start + length > this.RECEIPT_WIDTH) {
    //   length = this.RECEIPT_WIDTH - start;
    // }
    return ' '.repeat(start) + '-'.repeat(amount.length + 2);
  }

  toNumber = (value: string | number): number =>
    typeof value === 'string'
      ? parseFloat(value.replace(/,/g, '')) || 0
      : value || 0;

  getMaxWithFormattedOriginal(values: string[]) {
    const nums = values.map(v => Number(v.replace(/,/g, '')));
    const maxNum = Math.max(...nums);
    const index = nums.indexOf(maxNum);
    return { max: maxNum, original: values[index] };
  }
}

