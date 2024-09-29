interface CustomerSalesman {
    pk: string,
    desc: string
}

interface TableData {
    pk: string,
    price: number,
    qty: number,
    stockId: string,
    stockName: string
}

export interface TransactionSalesInvoiceDTO{
    loginUser: string,
    invoiceNo: string,
    date: string,
    warehouse: string,
    customer: CustomerSalesman,
    salesman: CustomerSalesman,
    tax: string,
    tableFormData: TableData[]
  }