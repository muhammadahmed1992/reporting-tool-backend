import { Injectable } from "@nestjs/common";
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
  constructor(private readonly localizationService: LocalizationService) {

  }
  private static ReceiptDistance: string = '\n\n';
  private static LineHeight: string = '\n';
  private static readonly RECEIPT_WIDTH = 32; // total character width
  private static readonly EQUALS_COL = 24; // fixed position for '=' sign
  private static readonly ITEM_INDENT_DEFAULT = 3;

  public async stockAdjustment(invoiceDetails: StockAdjustment[], locale: string = 'en', maxWidth: number = 32): Promise<string> {
    if (!invoiceDetails.length) return '';

    const first = invoiceDetails[0];
    const metadata = `${ReceiptFormatter.centerAlign(first.oleh)}\n\n`;

    let items = '';
    for (const detail of invoiceDetails) {
      const name = detail.cstkdesc.padEnd(14).slice(0, 14);
      const qty = String(detail.qty).padStart(3);
      const unit = detail.civdunit;
      items += `${ReceiptFormatter.formatStockItemLine(name, qty, unit, maxWidth)}${ReceiptFormatter.LineHeight}`;
    }

    const receiptNo = `${ReceiptFormatter.LineHeight}   ${await this.localizationService.translate(locale, 'backend', 'receipt_label')}: ${first.cinvrefno}`;
    const location = `${ReceiptFormatter.LineHeight}   ${first.cwhsdesc.trim()}${ReceiptFormatter.ReceiptDistance}`;

    return `${metadata}${items}${receiptNo}${location}`;
  }

  async salesOrder(data: any, locale: string = 'en', maxWidth: number = 32): Promise<string> {
    try {
      const translations = await this.localizationService.getTranslations(locale, 'backend');
      if (!data || (Array.isArray(data) && data?.length === 0)) return '';

      const firstRow = data[0];
      const {
        cinvrefno, oleh, pheader, pfooter, ninvvalue, total_item, cinvfkentcode, csamdesc, cwhsdesc
        , total_qty, subtotal, tax
      } = firstRow;

      const items: any[] = data.map(row => ({
        cstkdesc: row.cstkdesc.trim(),
        qty: row.qty,
        civdunit: row.civdunit.trim(),
        price: row.price,
        amount: row.amount,
      }));
      const lines: string[] = [];

      lines.push(ReceiptFormatter.centerMultilineText(pheader.trim(), maxWidth));
      lines.push(ReceiptFormatter.ReceiptDistance); // Adding Multiple new lines before printing the date time...
      lines.push(ReceiptFormatter.centerAlign(`${oleh}`));
      lines.push(ReceiptFormatter.centerAlign(`* ${translations['sales_order_label']} *`));

      let maxAmount = items[0].amount;
      for (const item of items) {

        // Line 1: Item name with 3 leading spaces
        lines.push(ReceiptFormatter.formatItemNameLine(item.cstkdesc.trim()));

        // Line 2: Qty, unit, unit price, and total amount (right-aligned)
        lines.push(ReceiptFormatter.formatItemDetailsLine(item.qty, item.civdunit, item.price, item.amount));

        if (item.amount > maxAmount)
          maxAmount = item.amount;

      }
      // Add dashed line under the equals sign
      lines.push(ReceiptFormatter.formatDashedLine(maxAmount));
      // Summary

      lines.push(ReceiptFormatter.formatSummaryLine(`  ${translations['subtotal_rp_label']}`, subtotal));
      if (tax > 0) {
        lines.push(ReceiptFormatter.formatSummaryLine(`  ${translations['tax_label']}`, tax));
      }

      // Add dashed line under the equals sign
      lines.push(ReceiptFormatter.formatDashedLine(subtotal));

      lines.push(ReceiptFormatter.formatSummaryLine(translations['total_label'], ninvvalue));
      // Add dashed line under the equals sign
      lines.push(ReceiptFormatter.formatDashedLine(ninvvalue));

      lines.push(ReceiptFormatter.formatItemNameLine(`${translations['total_qty_label']} = ${total_qty} (${total_item} ${translations["items_label"]})`));

      lines.push(`   ${translations["receipt_label"]}     : ${cinvrefno}`);
      lines.push(`   ${translations["member_label"]}      : ${cinvfkentcode?.trim()}`);
      lines.push(`   ${translations["waiter_label"]}      : ${csamdesc?.trim()}`);
      lines.push(`   ${translations["location_label"]}    : ${cwhsdesc?.trim()}`);
      lines.push(ReceiptFormatter.centerMultilineText(pfooter.trim(), maxWidth));
      lines.push('');
      lines.push('');
      lines.push(ReceiptFormatter.centerAlign(`.`.repeat(maxWidth - 2)));
      lines.push(ReceiptFormatter.ReceiptDistance);
      return (lines.join(ReceiptFormatter.LineHeight) + ReceiptFormatter.ReceiptDistance);
    } catch (e) {
      console.log('error while generating receipt: sales order');
      console.log(e);
      return '';
    }

  }
  async pointOfSales(data: any, locale: string = 'en', maxWidth: number = 32): Promise<string> {
    const translations = await this.localizationService.getTranslations(locale, 'backend');
    const firstRow = data[0];
    const {
      pheader, pfooter, cinvmeja, cinvrefno, ninvvalue,
      ninvtunai_ninvkembali, ninvkembali, ninvfreight, tax, subtotal,
      total_item, total_qty, oleh
    } = firstRow;

    const items: any[] = data.map(row => ({
      cstkdesc: row.cstkdesc.trim(),
      qty: row.qty,
      civdunit: row.civdunit.trim(),
      price: row.price,
      amount: row.amount,
    }));
    const lines: string[] = [];

    lines.push(ReceiptFormatter.centerMultilineText(pheader.trim(), maxWidth));
    lines.push(ReceiptFormatter.centerAlign(`${oleh}`));
    // Adding Multiple new lines before printing the date time...
    lines.push(ReceiptFormatter.ReceiptDistance);

    if (cinvmeja) {
      lines.push(` Table: ${cinvmeja}`);
      lines.push('--------------------');
    }

    // Items
    let maxAmount = items[0].amount;
    for (const item of items) {
      // Line 1: Item name with 3 leading spaces
      lines.push(ReceiptFormatter.formatItemNameLine(item.cstkdesc.trim()));

      // Line 2: Qty, unit, unit price, and total amount (right-aligned)
      lines.push(ReceiptFormatter.formatItemDetailsLine(item.qty, item.civdunit, item.price, item.amount));

      if (item.amount > maxAmount)
        maxAmount = item.amount;
    }

    // Add dashed line under the equals sign
    lines.push(ReceiptFormatter.formatDashedLine(maxAmount));
    // Summary

    lines.push(ReceiptFormatter.formatSummaryLine(`  ${translations['subtotal_rp_label']}`, subtotal));

    if (tax > 0) {
      lines.push(ReceiptFormatter.formatSummaryLine(`  ${translations['tax_label']}`, tax));
    }
    if (ninvfreight > 0) {
      lines.push(ReceiptFormatter.formatSummaryLine(`  ${translations['service_label']}`, ninvfreight));
    }

    // Add dashed line under the equals sign
    lines.push(ReceiptFormatter.formatDashedLine(subtotal));
    let total_dashedLine = ninvvalue;
    lines.push(ReceiptFormatter.formatSummaryLine(`  ${translations['total_label']}`, ninvvalue));

    if (ninvtunai_ninvkembali > 0) {
      lines.push(ReceiptFormatter.formatSummaryLine(`  ${translations['cash_label']}`, ninvtunai_ninvkembali));
    }
    if (ninvkembali > 0) {
      lines.push(ReceiptFormatter.formatSummaryLine(`  ${translations['change_label']}`, ninvkembali));
    }
    // For calculating the dashed to be appear for maximum value.
    if (total_dashedLine < ninvtunai_ninvkembali) {
      total_dashedLine = ninvtunai_ninvkembali;
    }
    if (total_dashedLine < ninvkembali) {
      total_dashedLine = ninvkembali;
    }

    // Add dashed line under the equals sign
    lines.push(ReceiptFormatter.formatDashedLine(total_dashedLine));

    lines.push(ReceiptFormatter.formatItemNameLine(`${translations['total_qty_label']} = ${total_qty} (${total_item} ${translations["items_label"]})`));
    lines.push(`   ${translations["receipt_label"]}     : ${cinvrefno}`);
    lines.push('');
    lines.push('');
    lines.push(ReceiptFormatter.centerMultilineText(pfooter.trim(), maxWidth));
    lines.push('');
    lines.push('');
    lines.push(ReceiptFormatter.centerAlign(`.`.repeat(maxWidth - 2)));
    lines.push(ReceiptFormatter.ReceiptDistance);
    return (lines.join(ReceiptFormatter.LineHeight) + ReceiptFormatter.ReceiptDistance);
  }

  async sales(data: any, locale: string = 'en', maxWidth: number = 32): Promise<string> {
    try {
      const translations = await this.localizationService.getTranslations(locale, 'backend');
      if (!data || (Array.isArray(data) && data?.length === 0)) return '';

      const firstRow = data[0];
      const {
        cinvrefno, oleh, pheader, pfooter, ninvvalue, total_item, cinvfkentcode, csamdesc, cwhsdesc
        , total_qty, subtotal, tax
      } = firstRow;

      const items: any[] = data.map(row => ({
        cstkdesc: row.cstkdesc.trim(),
        qty: row.qty,
        civdunit: row.civdunit.trim(),
        price: row.price,
        amount: row.amount,
      }));
      const lines: string[] = [];

      lines.push(ReceiptFormatter.centerMultilineText(pheader.trim(), maxWidth));
      // Adding Multiple new lines before printing the date time...
      lines.push(ReceiptFormatter.ReceiptDistance);
      lines.push(ReceiptFormatter.centerAlign(`${oleh}`));
      lines.push(ReceiptFormatter.centerAlign(`* ${translations['sales_label']} *`));

      let maxAmount = items[0].amount;
      for (const item of items) {

        // Line 1: Item name with 3 leading spaces
        lines.push(ReceiptFormatter.formatItemNameLine(item.cstkdesc.trim()));

        // Line 2: Qty, unit, unit price, and total amount (right-aligned)
        lines.push(ReceiptFormatter.formatItemDetailsLine(item.qty, item.civdunit, item.price, item.amount));

        if (item.amount > maxAmount)
          maxAmount = item.amount;

      }
      // Add dashed line under the equals sign
      lines.push(ReceiptFormatter.formatDashedLine(maxAmount));

      // Summary

      lines.push(ReceiptFormatter.formatSummaryLine(`  ${translations['subtotal_rp_label']}`, subtotal));
      if (tax > 0) {
        lines.push(ReceiptFormatter.formatSummaryLine(`  ${translations['tax_label']}`, tax));
      }

      // Add dashed line under the equals sign
      lines.push(ReceiptFormatter.formatDashedLine(subtotal));

      lines.push(ReceiptFormatter.formatSummaryLine(translations['total_label'], ninvvalue));
      // Add dashed line under the equals sign
      lines.push(ReceiptFormatter.formatDashedLine(ninvvalue));

      lines.push(ReceiptFormatter.formatItemNameLine(`${translations['total_qty_label']} = ${total_qty} (${total_item} ${translations["items_label"]})`));

      lines.push(`   ${translations["receipt_label"]}     : ${cinvrefno}`);
      lines.push(`   ${translations["member_label"]}      : ${cinvfkentcode?.trim()}`);
      lines.push(`   ${translations["waiter_label"]}      : ${csamdesc?.trim()}`);
      lines.push(`   ${translations["location_label"]}    : ${cwhsdesc?.trim()}`);
      lines.push(ReceiptFormatter.centerMultilineText(pfooter.trim(), maxWidth));
      lines.push('');
      lines.push('');
      lines.push(ReceiptFormatter.centerAlign(`.`.repeat(maxWidth - 2)));
      lines.push(ReceiptFormatter.ReceiptDistance);
      return (lines.join(ReceiptFormatter.LineHeight) + ReceiptFormatter.ReceiptDistance);
    } catch (e) {
      console.log('error while generating receipt: sales');
      console.log(e);
      return '';
    }
  }

  private static centerAlign(text: string, width = 32): string {
    const cleanText = text.trim();
    const spaces = Math.max(0, Math.floor((width - cleanText.length) / 2));
    return ' '.repeat(spaces) + cleanText;
  }

  private static formatStockItemLine(itemName, qty, unit, LINE_WIDTH: number = 32, paddingLeft = 3, equalColumnIndex = 24) {
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
  private static centerMultilineText(text: string, width: number = 32): string {
    return text
      .split(/\r?\n/)
      .map(line => {
        const trimmed = line.trim();
        const padding = Math.max(0, Math.floor((width - trimmed.length) / 2));
        return ' '.repeat(padding) + trimmed;
      })
      .join('\n');
  }

  private static pad(str: string, len: number, align: 'left' | 'right' = 'left'): string {
    if (str.length > len) return str.slice(0, len);
    const padding = ' '.repeat(len - str.length);
    return align === 'right' ? padding + str : str + padding;
  }

  // Formats line like: "1 pcs    15,000   =     30,000"
  private static formatItemDetailsLine(qty: string, unit: string, price: string, total: string): string {
    const qtyPad = this.pad(qty, 8, 'right');    // supports up to 99999
    const unitPad = this.pad(unit, 6, 'right');  // fixed
    const pricePad = this.pad(price, 10, 'right'); // price with comma (e.g., 150,000)
    const left = `${qtyPad}${unitPad}${pricePad}`;
    const spaceToEquals = this.EQUALS_COL - left.length;
    const paddedLeft = left + ' '.repeat(spaceToEquals);
    const rightPad = this.pad(total, this.RECEIPT_WIDTH - this.EQUALS_COL - 2, 'right'); // -2 for '= '
    return `${paddedLeft}= ${rightPad}`;
  }

  // Just the item name (on its own line)
  private static formatItemNameLine(name: string): string {
    const leftPadding = ' '.repeat(3); // 3 spaces
    const contentWidth = this.RECEIPT_WIDTH - leftPadding.length;
    const paddedName = name.padEnd(contentWidth); // or padStart if you want right alignment
    return leftPadding + paddedName;
  }

  // For subtotal, total etc: "Subtotal Rp. =     70,000"
  private static formatSummaryLine(label: string, amount: string): string {
    const left = this.pad(label, this.EQUALS_COL - 1, 'right'); // leave space before '='
    const equals = ' =';
    const right = ' ' + this.pad(amount, this.RECEIPT_WIDTH - this.EQUALS_COL - 1, 'right');
    return left + equals + right;
  }

  // Dashes under the '=' column
  static formatDashedLine(amount?: string): string {
    const start = this.EQUALS_COL;
    let length = amount.length + 3; // for space after '='
    if (start + length > this.RECEIPT_WIDTH) {
      length = this.RECEIPT_WIDTH - start;
    }
    return ' '.repeat(start) + '-'.repeat(length);
  }
}

