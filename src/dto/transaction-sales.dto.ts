export interface WarehouseDto {
    primaryKey: string;
    description: string;
  }
  
  export interface TransactionSalesDto {
    InvoiceNo: string;
    Date: string;
    Warehouse: WarehouseDto 
    Customer: string;
    Salesman: string;
    Tax: number;
  }
  