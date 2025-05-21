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
  private static ReceiptDistance: string = '\n\n\r\r';
  private static LineHeight: string = '\n';
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

  static salesOrder(data: any, maxWidth: number = 32): string {
    try {
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

      lines.push(ReceiptFormatter.centerAlign(pheader.trim()));
      lines.push(ReceiptFormatter.centerAlign(`${oleh}`));
      lines.push(ReceiptFormatter.centerAlign(`* Sales Order *`));
      lines.push(ReceiptFormatter.centerAlign(`--------------------------------`));

      let equalsStartPos = maxWidth - 20;
      const itemIndent = 3;
      for (const item of items) {

        // Line 1: Item name with 3 leading spaces
        const name = ' '.repeat(itemIndent) + item.cstkdesc.slice(0, maxWidth - itemIndent);
        lines.push(name);

        // Line 2: Qty, unit, unit price, and total amount (right-aligned)
        const line2Indent = itemIndent + 1; // 4 spaces
        const qtyUnitPrice = `${item.qty} ${item.civdunit} @ ${item.price} = `;
        const leftPart = ' '.repeat(line2Indent) + qtyUnitPrice;

        const amount = item.amount;
        const rightPadding = Math.max(0, maxWidth - leftPart.length - amount.length);
        const fullLine = leftPart + ' '.repeat(rightPadding) + amount;
        lines.push(fullLine);

        // Capture '=' index to align the dashed line later
        const eqIndex = fullLine.indexOf('=');
        if (eqIndex > -1) {
          equalsStartPos = eqIndex;
        }
      }
      // Add dashed line under the equals sign
      const dashes = ' '.repeat(equalsStartPos) + '-'.repeat(maxWidth - equalsStartPos);
      lines.push(dashes);

      // Summary
      const { line: subtotalLine, dashLine: dash1 } = ReceiptFormatter.formatLabelValue('Subtotal Rp.', subtotal);
      lines.push(subtotalLine);
      const { line: taxLine } = ReceiptFormatter.formatLabelValue('Tax Rp.', tax);
      lines.push(taxLine);
      lines.push(dash1);

      const { line: totalLine, dashLine: dash2 } = ReceiptFormatter.formatLabelValue('TOTAL Rp.', ninvvalue);
      lines.push(totalLine);
      lines.push(dash2);

      const totalQtyLine = ' '.repeat(itemIndent) + `Total Qty = ${total_qty} (${total_item} items)`.slice(0, maxWidth - itemIndent);
      lines.push(totalQtyLine);

      lines.push(`Receipt: ${cinvrefno}`);
      lines.push(` Member: ${cinvfkentcode?.trim()}`);
      lines.push(` Waiter: ${csamdesc?.trim()}`);
      lines.push(` ${cwhsdesc?.trim()}`);
      lines.push(ReceiptFormatter.centerAlign(pfooter.trim()));
      lines.push('');
      lines.push(ReceiptFormatter.centerAlign(`.`.repeat(maxWidth - 2)));
      return (lines.join(ReceiptFormatter.LineHeight) + ReceiptFormatter.ReceiptDistance);
    } catch (e) {
      console.log('error while generating receipt: sales');
      console.log(e);
      return '';
    }

  }
  static pointOfSales(data: any): string {
    const firstRow = data[0];
    const {
      pheader, pfooter, cinvmeja, cinvrefno, ninvvalue,
      ninvtunai_ninvkembali, ninvkembali, ninvfreight, tax, subtotal,
      total_item, total_qty, oleh, dateTime
    } = firstRow;

    const items: any[] = data.map(row => ({
      cstkdesc: row.cstkdesc.trim(),
      qty: row.qty,
      civdunit: row.civdunit.trim(),
      price: row.price,
      amount: row.amount,
    }));
    const lines: string[] = [];

    lines.push(ReceiptFormatter.centerAlign(pheader.trim()));
    lines.push(`${dateTime}`);
    lines.push(`Table: ${cinvmeja}`);
    lines.push(`Cashier: ${oleh}`);
    lines.push('--------------------------------');
    // Items
    for (const item of items) {
      const name = item.cstkdesc.slice(0, 18); // keep short for 58mm
      const qtyUnit = `${item.qty} ${item.civdunit}`;
      const price = item.price;

      // Line 1: item name
      lines.push(name);
      // Line 2: qty x price and total amount (right aligned)
      const qtyPrice = `${qtyUnit} x ${price}`;
      const amount = item.amount.padStart(32 - qtyPrice.length);
      lines.push(qtyPrice + amount);
    }

    // Summary
    lines.push('--------------------------------');
    lines.push(ReceiptFormatter.formatLine('Subtotal Rp.', subtotal));
    lines.push(ReceiptFormatter.formatLine('Tax Rp.', tax));
    lines.push(ReceiptFormatter.formatLine('Service Rp.', ninvfreight));
    lines.push('--------------------------------');
    lines.push(ReceiptFormatter.formatLine('TOTAL Rp.', ninvvalue));
    lines.push(ReceiptFormatter.formatLine('Cash Rp.', ninvtunai_ninvkembali));
    lines.push(ReceiptFormatter.formatLine('Change Rp.', ninvkembali));
    lines.push('--------------------------------');
    lines.push(`Qty: ${total_qty} (${total_item} items)`);
    lines.push(`Receipt: ${cinvrefno}`);
    lines.push(ReceiptFormatter.centerAlign(pfooter.trim()));
    return (lines.join(ReceiptFormatter.LineHeight) + ReceiptFormatter.ReceiptDistance);
  }

  static sales(data: any, maxWidth: number = 32): string {
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

    lines.push(ReceiptFormatter.centerAlign(pheader.trim()));
    lines.push(ReceiptFormatter.centerAlign(`${oleh}`));
    lines.push(ReceiptFormatter.centerAlign(`* Sales *`));
    lines.push(ReceiptFormatter.centerAlign(`--------------------------------`));

    let equalsStartPos = maxWidth - 20;
    const itemIndent = 3;
    for (const item of items) {

      // Line 1: Item name with 3 leading spaces
      const name = ' '.repeat(itemIndent) + item.cstkdesc.slice(0, maxWidth - itemIndent);
      lines.push(name);

      // Line 2: Qty, unit, unit price, and total amount (right-aligned)
      const line2Indent = itemIndent + 1; // 4 spaces
      const qtyUnitPrice = `${item.qty} ${item.civdunit} @ ${item.price} = `;
      const leftPart = ' '.repeat(line2Indent) + qtyUnitPrice;

      const amount = item.amount;
      const rightPadding = Math.max(0, maxWidth - leftPart.length - amount.length);
      const fullLine = leftPart + ' '.repeat(rightPadding) + amount;
      lines.push(fullLine);

      // Capture '=' index to align the dashed line later
      const eqIndex = fullLine.indexOf('=');
      if (eqIndex > -1) {
        equalsStartPos = eqIndex;
      }
    }
    // Add dashed line under the equals sign
    const dashes = ' '.repeat(equalsStartPos) + '-'.repeat(maxWidth - equalsStartPos);
    lines.push(dashes);

    // Summary
    const { line: subtotalLine, dashLine: dash1 } = ReceiptFormatter.formatLabelValue('Subtotal Rp.', subtotal);
    lines.push(subtotalLine);
    const { line: taxLine } = ReceiptFormatter.formatLabelValue('Tax Rp.', tax);
    lines.push(taxLine);
    lines.push(dash1);

    const { line: totalLine, dashLine: dash2 } = ReceiptFormatter.formatLabelValue('TOTAL Rp.', ninvvalue);
    lines.push(totalLine);
    lines.push(dash2);

    const totalQtyLine = ' '.repeat(itemIndent) + `Total Qty = ${total_qty} (${total_item} items)`.slice(0, maxWidth - itemIndent);
    lines.push(totalQtyLine);

    lines.push(`Receipt: ${cinvrefno}`);
    lines.push(` Member: ${cinvfkentcode?.trim()}`);
    lines.push(` Waiter: ${csamdesc?.trim()}`);
    lines.push(` ${cwhsdesc?.trim()}`);
    lines.push(ReceiptFormatter.centerAlign(pfooter.trim()));
    lines.push('');
    lines.push(ReceiptFormatter.centerAlign(`.`.repeat(maxWidth - 2)));
    return (lines.join(ReceiptFormatter.LineHeight) + ReceiptFormatter.ReceiptDistance);
  }

  private static centerAlign(text: string, width = 32): string {
    const cleanText = text.trim();
    const spaces = Math.max(0, Math.floor((width - cleanText.length) / 2));
    return ' '.repeat(spaces) + cleanText;
  }

  private static formatLine(label: string, value: number, width = 32): string {
    const valStr = typeof value === 'number' ? value.toLocaleString() : (value as any).toString();
    const padding = Math.max(width - label.length - valStr.length, 0);
    return label + ' '.repeat(padding) + valStr;
  }

  private static formatLabelValue = (
    label: string,
    value: number,
    equalsColumn = 18,
    totalWidth = 32
  ): { line: string; dashLine: string } => {
    const valueStr = value.toLocaleString();
    const labelStr = label.trim();
    const labelPadding = equalsColumn - labelStr.length - 1; // space before '='
    const left = ' '.repeat(Math.max(0, labelPadding)) + labelStr;
    const spaceBetween = ' = ';
    const rightPadding = totalWidth - (left + spaceBetween + valueStr).length;
    const line = left + spaceBetween + ' '.repeat(rightPadding) + valueStr;

    // Dash line starts from `=` column and ends where value ends
    const dashStart = equalsColumn;
    const dashLength = totalWidth - equalsColumn;
    const dashLine = ' '.repeat(dashStart) + '-'.repeat(dashLength);

    return { line, dashLine };
  };

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
}
