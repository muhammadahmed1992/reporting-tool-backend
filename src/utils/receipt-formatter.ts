export function generateReceipt(data: {
    dateTime: string;
    items: { name: string; qty: number; price: number; total: number }[];
    subtotal: number;
    tax: number;
    service: number;
    total: number;
    cash: number;
    change: number;
    receiptNo: number | string;
    type: string;
    pax: number;
  }): string {
    const {
      dateTime,
      items,
      subtotal,
      tax,
      service,
      total,
      cash,
      change,
      receiptNo,
      type,
      pax,
    } = data;
  
    const lines: string[] = [];
  
    // Header
    lines.push(centerText(dateTime, 32));
    lines.push("");
  
    // Dynamic Items
    for (const item of items) {
      lines.push(`${item.name}`);
      lines.push(
        `${item.qty} Porsi  ${formatCurrency(item.price)}   =  ${formatCurrency(item.total)}P`
      );
    }
  
    lines.push(divider());
    lines.push(`Subtotal Rp.   =  ${formatCurrency(subtotal)}`);
    lines.push(`Tax Rp.        =  ${formatCurrency(tax)}`);
    lines.push(`Service Rp.    =  ${formatCurrency(service)}`);
    lines.push(divider());
    lines.push(`Total Rp.      =  ${formatCurrency(total)}`);
    lines.push(`Cash Rp.       =  ${formatCurrency(cash)}`);
    lines.push(divider());
    lines.push(`Change Rp.     =  ${formatCurrency(change)}`);
    lines.push("");
  
    // Footer
    const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
    lines.push(`Total Qty = ${totalQty} (${items.length} items)`);
    lines.push(`Receipt: ${receiptNo}`);
    lines.push(`${type}`);
    lines.push(`Pax: ${pax}`);
    lines.push("".padEnd(32, '.'));
  
    return lines.join("\n");
  }
  
  // Helpers
  function formatCurrency(amount: number): string {
    return amount.toLocaleString("id-ID");
  }
  
  function centerText(text: string, width = 32): string {
    const pad = Math.floor((width - text.length) / 2);
    return " ".repeat(Math.max(pad, 0)) + text;
  }
  
  function divider(): string {
    return "-".repeat(32);
  }  