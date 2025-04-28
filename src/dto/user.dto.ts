export interface UserDTO {
    IsSwitchDatabase: boolean,
    IsPurchaseReportAllowed: boolean,
    IsStockReportAllowed: boolean,
    IsSalesReportAndCashReportAllowed: boolean,
    IsSalesAndSalesOrderAndPosTransactionAllowed: boolean,
    IsStockAdjusmentAllowed: boolean,
    IsBarcodeWithPurchasePriceAllowed: boolean,
    IsValid: boolean
}
