import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import ApiResponse from 'src/helper/api-response';
import { GenericRepository } from 'src/repository/generic.repository';
import ResponseHelper from 'src/helper/response-helper';
import Constants from 'src/helper/constants';
import { TransactionSalesTableDto } from 'src/dto/transaction-sales-table.dto';
import TransactionError from 'src/utils/errors/transaction.error';
import { ReceiptFormatter } from 'src/utils/receipt-formatter';
import { PrinterConfigService } from './printer.config.service';
import { LocaleService } from './locale.service';

@Injectable()
export class TransactionModuleService {
  constructor(
    private readonly genericRepository: GenericRepository,
    private readonly formatter: ReceiptFormatter,
    private readonly printerConfig: PrinterConfigService,

  ) { }

  async salesInvoice(user: string) {
    await this.genericRepository.query(`
      UPDATE ymk
      SET L_jual = '1000'
      WHERE TRIM(L_jual) NOT REGEXP '^[0-9]+$';
    `);

    // 2. Next, increment L_opname by 1 only if it's a numeric value.
    await this.genericRepository.query(`
      UPDATE ymk
      SET L_jual = CAST(CAST(TRIM(L_jual) AS UNSIGNED) + 1 AS CHAR)
      WHERE TRIM(L_jual) REGEXP '^[0-9]+$';
    `);

    const query = `
      SELECT
          (select L_jual from ymk) AS InvoiceNo,
          DATE_FORMAT(CURDATE(), '%d-%m-%Y') AS 'Date',
          w.cwhspk as primarykey,
          (TRIM(w.cwhsdesc)) AS description,
          ('') AS Customer,
          ('') AS Salesman,
          (SELECT njualtax FROM ymk) AS Tax
      FROM
          android2 a
      JOIN
          warehouse w ON w.cwhspk = a.candfkwhs
      WHERE
          canddesc = ?;
    `;

    const response = await this.genericRepository.query<any>(query, [user]);


    // Parse the Warehouse JSON string into an object
    const warehouse = { primaryKey: '', description: '' };
    const finalResponse = {
      InvoiceNo: '',
      Date: '',
      Warehouse: null,
      Customer: '',
      Salesman: '',
      Tax: 0,
    };
    if (response?.length) {
      finalResponse.InvoiceNo = response[0].InvoiceNo;
      finalResponse.Date = response[0].Date;
      finalResponse.Customer = response[0].Customer;
      finalResponse.Salesman = response[0].Salesman;
      finalResponse.Tax = response[0].Tax;
      warehouse.primaryKey = response[0].primarykey;
      warehouse.description = response[0].description;
      finalResponse.Warehouse = warehouse;

      return ResponseHelper.CreateResponse<any>(
        finalResponse,
        HttpStatus.OK,
        Constants.DATA_SUCCESS,
      );
    } else {
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.NOT_FOUND,
        Constants.LOCATION_NOT_FOUND,
      );
    }
  }

  async salesTable(queryParams: any) {
    const { stockId } = queryParams;
    const query = `
      SELECT 
        nstkppn as taxable, 
        cstkpk as pk, 
        cstdcode as stock_id_header, 
        TRIM(cstkdesc) as stock_name, 
        nstdprice as price, 
        1 as qty 
      FROM 
        stockdetail d 
      JOIN 
        stock s ON s.cstkpk = d.cstdfkstk 
      WHERE 
        cstdcode = ?;
    `;

    const response =
      await this.genericRepository.query<TransactionSalesTableDto>(query, [
        stockId,
      ]);

    if (response?.length) {
      return ResponseHelper.CreateResponse<any>(
        response,
        HttpStatus.OK,
        Constants.DATA_SUCCESS,
      );
    } else {
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.NOT_FOUND,
        Constants.DATA_NOT_FOUND,
      );
    }
  }

  // Sales Transaction Processing
  async setSalesInvoice(body: any) {
    try {
      const allQuantitiesZero = body.tableFormData.every((item: any) => parseInt(item.qty, 10) === 0);

      // If all quantities are zero, throw an error
      if (allQuantitiesZero) {
        throw new TransactionError(Constants.FILL_ORDER_ERROR);
      }
      // Insert invoice details first
      const invoiceQuery = `
    SET @cinvpk := LEFT(SHA1(UUID()), 23);
    INSERT INTO invoice (
        cinvrefno, cinvfkwhs, dinvdate, dinvdue, dinvtaxdate, 
        cinvfkent, cinvfkentcode, cinvhadiah, cinvfksam, cinvpk, 
        ninvtax, cinvuser, oleh,
        cinvspecial, cinvtransfer, cinvfkexc, kunci, ninvrate, 
        ninvoption, ninvratep, cinvserie, cinvtaxinv, cinvpo, 
        ninvno_card, ninvjenis_card, ninvccard_nama, ninvccard_oto, 
        cinvdine, cinvmeja, cinvsedan, cinvsedancode, cinvepajak, 
        cinvremark, cinvremark1, ninvkembali, ninvpoint, ninvpax, 
        npostransfer, ninvpromov, ninvpromod, ninvpromos, ninvkm, 
        ninvpawal, ninvcetak1, ninvpilih, ninvpersen, xkirim, nivdtime, ninvvalue, cinvtambah 
    ) VALUES (
        ?, ?, STR_TO_DATE(?, '%d-%m-%Y'), CURDATE(), 
        STR_TO_DATE(?, '%d-%m-%Y'), ?, ?, ?, 
        ?, @cinvpk, ?, ?, 
        CONCAT(DATE_FORMAT(NOW(), '%d-%m-%Y %H:%i'), ' ', ?), 
        'JL', -- cinvspecial
        'n/a', -- cinvtransfer
        '..rupiah...............', -- cinvfkexc
        1, -- kunci
        1, -- ninvrate
        1, -- ninvoption
        1, -- ninvratep
        ' ', -- cinvserie
        ' ', -- cinvtaxinv
        ' ', -- cinvpo
        ' ', -- ninvno_card
        ' ', -- ninvjenis_card
        ' ', -- ninvccard_nama
        ' ', -- ninvccard_oto
        ' ', -- cinvdine
        ' ', -- cinvmeja
        ' ', -- cinvsedan
        ' ', -- cinvsedancode
        ' ', -- cinvepajak
        ' ', -- cinvremark
        ' ', -- cinvremark1
        0, -- ninvkembali (Default to 0 for decimal fields)
        0, -- ninvpoint (Default to 0 for decimal fields)
        0, -- ninvpax (Default to 0 for decimal fields)
        0, -- npostransfer (Default to 0 for decimal fields)
        0, -- ninvpromov (Default to 0 for decimal fields)
        0, -- ninvpromod (Default to 0 for decimal fields)
        0, -- ninvpromos (Default to 0 for decimal fields)
        0, -- ninvkm (Default to 0 for decimal fields)
        0, -- ninvpawal (Default to 0 for decimal fields)
        0, -- ninvcetak1 (Default to 0 for decimal fields)
        0, -- ninvpilih (Default to 0 for decimal fields)
        0, -- ninvpersen (Default to 0 for decimal fields)
        0, -- xkirim (Default to 0 for decimal fields)
        CURDATE(), -- nivdtime
        ?,
        '01' -- cinvtambah
    );
    SELECT CAST(@cinvpk AS CHAR) AS InvoicePkNo;
    `;

      const invoiceParams = [
        body.invoice.invoiceNo,
        body.invoice.warehouse,
        body.invoice.date,
        body.invoice.date,
        body.invoice.customer.pk,
        body.invoice.customer.desc,
        body.invoice.customer.desc,
        body.invoice.salesman.pk || '..default..............',
        body.invoice.tax,
        body.invoice.loginUser,
        body.invoice.loginUser,
        body.payment.total
      ];

      const [_, invoiceResponse, pkres] = await this.genericRepository.query<any>(
        invoiceQuery,
        invoiceParams,
      );
      if (!invoiceResponse || invoiceResponse.affectedRows === 0) {
        return ResponseHelper.CreateResponse<any>(
          null,
          HttpStatus.INTERNAL_SERVER_ERROR,
          Constants.TRANSACTION_FAILURE,
        );
      }
      // Handle invoice response
      const invoicePkNo = pkres[0].InvoicePkNo;
      body.tableFormData = body.tableFormData.filter(item => parseInt(item.qty, 10) !== 0);
      console.log('--------------------');
      console.log('SalesInvoice');
      console.table(body.tableFormData);
      for (let i = 0; i < body.tableFormData.length; i++) {
        const row = body.tableFormData[i];

        const detailQuery = `
                INSERT INTO invoicedetail (
                    civdfkstk, civdcode, nivdqtyout, civdpk, civdfkinv, nivdprice,
                    nivdfactor, nivdzqtyout, nivdamount, nivdorder, civdunit, nivdstkppn, nivdkirim,
                    civdsn, civdmemo, nivdpokok
                ) 
                SELECT ?, ?, ?, LEFT(SHA1(UUID()), 23),
                    ?, 
                    ?, sd.nstdfactor, ? * sd.nstdfactor,
                    ? * ?, ?, u.cunidesc, s.nstkppn,1, ' ', ' ', (select nstkbuy from stock where cstkpk= ?) * (? * sd.nstdfactor)
                FROM stockdetail sd
                LEFT JOIN unit u ON u.cunipk = sd.cstdfkuni
                LEFT JOIN stock s ON s.cstkpk = ?
                WHERE sd.cstdcode = ?
            `;

        const detailParams = [
          row.pk,
          row.stock_id_header,
          row.qty,
          invoicePkNo,
          row.price,
          row.qty,
          row.qty,
          row.price,
          i + 1,
          row.pk,
          row.qty,
          row.pk,
          row.stock_id_header,
        ];
        const detailResponse = await this.genericRepository.query<any>(
          detailQuery,
          detailParams,
        );
      }
      /**
       * Now Querying Data for Printing Sales Receipt...
       */
      const receiptQuery = `
select LTRIM(RTRIM(cinvmeja)) as cinvmeja,cinvrefno,ninvdp,ninvvoucher,(ninvtunai+ninvkembali) as ninvtunai_ninvkembali,ninvpiutang,ninvcredit,ninvdebit,
ninvmobile,ninvkembali,format(ninvvalue, 0) as ninvvalue,oleh,format(ninvfreight,0) as ninvfreight,LTRIM(RTRIM(csamdesc)) as csamdesc,LTRIM(RTRIM(pheader)) as pheader,
LTRIM(RTRIM(pfooter)) as pfooter,LTRIM(RTRIM(cwhsdesc)) as cwhsdesc,
sum(1) as total_item,
format(sum(nivdqtyout),0) as total_qty,
sum(1) as total_item,
format(sum(nivdqtyout),0) as total_qty,
format(sum(nivdamount)*(1-ninvdisc1/100)*(1-ninvdisc2/100)*(1-ninvdisc3/100)-ninvdisc,0) as subtotal,
format(sum(if(nivdstkppn=1,((nivdamount)*(1-ninvdisc1/100)*(1-ninvdisc2/100)*(1-ninvdisc3/100)-ninvdisc)*ninvtax/100,0)),0) as tax,
LTRIM(RTRIM(cinvfkentcode)) as cinvfkentcode
from invoice
inner join invoicedetail on cinvpk=civdfkinv
inner join stock on cstkpk=civdfkstk
inner join salesman on cinvfksam=csampk
inner join warehouse on cinvfkwhs=cwhspk
inner join ymk
where cinvpk=?
group by cinvmeja,cinvrefno,ninvdp,ninvvoucher,ninvtunai+ninvkembali,ninvpiutang,ninvcredit,ninvdebit,ninvmobile,ninvkembali,ninvvalue,oleh,ninvfreight,csamdesc,pheader,pfooter,cwhsdesc;

select LTRIM(RTRIM(cstkdesc)) as cstkdesc,format(nivdqtyout,0) as qty,LTRIM(RTRIM(civdunit)) as civdunit,format(nivdamount/nivdqtyout,0) as price,
format(nivdamount,0) as amount
from invoice
inner join invoicedetail on cinvpk=civdfkinv
inner join stock on cstkpk=civdfkstk
where cinvpk=?;

`;
      const params = [invoicePkNo, invoicePkNo];
      const [receiptMasterResponse, receiptDetailResponse] = await this.genericRepository.query<any>(receiptQuery, params);
      console.log(`master response`);
      console.log(receiptMasterResponse);
      console.log(`detail response`);
      console.log(receiptDetailResponse);
      if (!receiptMasterResponse || (Array.isArray(receiptDetailResponse) && receiptDetailResponse.length === 0)) {
        return ResponseHelper.CreateResponse<any>(
          [],
          HttpStatus.OK,
          Constants.TRANSACTION_SUCCESS);
      }
      this.formatter.setWidth(this.printerConfig.getPrinterWidth());
      const receipt = await this.formatter.sales(receiptMasterResponse, receiptDetailResponse);
      console.log(receipt);
      return ResponseHelper.CreateResponse<any>(
        receipt,
        HttpStatus.OK,
        Constants.TRANSACTION_SUCCESS,
      );
    } catch (error) {
      // for avoiding data corruption
      if (error instanceof TransactionError) {
        return ResponseHelper.CreateResponse<any>(
          null,
          HttpStatus.BAD_REQUEST,
          error.message,
        );
      }
      const deleteInvoiceDetail = `Delete FROM invoicedetail WHERE civdfkinv = (SELECT cinvpk FROM invoice WHERE cinvrefno = ? and cinvspecial = 'JL')`;
      await this.genericRepository.query<any>(
        deleteInvoiceDetail,
        [body.invoice.invoiceNo],
      );
      const deleteInvoice = `Delete FROM invoice WHERE cinvrefno = ?`;
      await this.genericRepository.query<any>(
        deleteInvoice,
        [body.invoice.invoiceNo],
      );
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.INTERNAL_SERVER_ERROR,
        Constants.TRANSACTION_FAILURE,
      );
    }
  }

  async salesOrderInvoice(user: string) {

    await this.genericRepository.query(`
      UPDATE ymk
      SET L_so = '1000'
      WHERE TRIM(L_so) NOT REGEXP '^[0-9]+$';
    `);

    // 2. Next, increment L_opname by 1 only if it's a numeric value.
    await this.genericRepository.query(`
      UPDATE ymk
      SET L_so = CAST(CAST(TRIM(L_so) AS UNSIGNED) + 1 AS CHAR)
      WHERE TRIM(L_so) REGEXP '^[0-9]+$';
    `);

    const query = `
      SELECT
          (Select L_so FROM ymk) AS InvoiceNo,
          DATE_FORMAT(CURDATE(), '%d-%m-%Y') AS 'Date',
          w.cwhspk as primarykey,
          (TRIM(w.cwhsdesc)) AS description,
          ('') AS Customer,
          ('') AS Salesman,
          (SELECT njualtax FROM ymk) AS Tax
      FROM
          android2 a
      JOIN
          warehouse w ON w.cwhspk = a.candfkwhs
      WHERE
          canddesc = ?;
    `;

    const response = await this.genericRepository.query<any>(query, [user]);

    // Parse the Warehouse JSON string into an object
    const warehouse = { primaryKey: '', description: '' };
    const finalResponse = {
      InvoiceNo: '',
      Date: '',
      Warehouse: null,
      Customer: '',
      Salesman: '',
      Tax: 0,
    };
    if (response?.length) {
      finalResponse.InvoiceNo = response[0].InvoiceNo;
      finalResponse.Date = response[0].Date;
      finalResponse.Customer = response[0].Customer;
      finalResponse.Salesman = response[0].Salesman;
      finalResponse.Tax = response[0].Tax;
      warehouse.primaryKey = response[0].primarykey;
      warehouse.description = response[0].description;
      finalResponse.Warehouse = warehouse;

      return ResponseHelper.CreateResponse<any>(
        finalResponse,
        HttpStatus.OK,
        Constants.DATA_SUCCESS,
      );
    } else {
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.NOT_FOUND,
        Constants.LOCATION_NOT_FOUND,
      );
    }
  }

  async salesOrderTable(queryParams: any) {
    const { stockId } = queryParams;
    const query = `
      SELECT 
        nstkppn as taxable, 
        cstkpk as pk, 
        cstdcode as stock_id_header, 
        TRIM(cstkdesc) as stock_name, 
        nstdprice as price, 
        1 as qty 
      FROM 
        stockdetail d 
      JOIN 
        stock s ON s.cstkpk = d.cstdfkstk 
      WHERE 
        cstdcode = ?;
    `;

    const response =
      await this.genericRepository.query<TransactionSalesTableDto>(query, [
        stockId,
      ]);
    if (response?.length) {
      return ResponseHelper.CreateResponse<any>(
        response,
        HttpStatus.OK,
        Constants.DATA_SUCCESS,
      );
    } else {
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.NOT_FOUND,
        Constants.DATA_NOT_FOUND,
      );
    }
  }

  // Sales Order Transaction Processing
  async setSalesOrderInvoice(body: any) {

    try {
      const allQuantitiesZero = body.tableFormData.every((item: any) => parseInt(item.qty, 10) === 0);

      // If all quantities are zero, throw an error
      if (allQuantitiesZero) {
        throw new TransactionError(Constants.FILL_ORDER_ERROR);
      }
      const invoiceQuery = `
    SET @cinvpk := LEFT(SHA1(UUID()), 23);
    INSERT INTO porder (
        cinvrefno, cinvfkwhs, dinvdate, dinvdue, dinvtaxdate, 
        cinvfkent, cinvfkentcode, cinvhadiah, cinvfksam, cinvpk, 
        ninvtax, cinvuser, oleh, ninvexpire, cinvspecial, 
        cinvtransfer, cinvfkexc, kunci, ninvrate, ninvjenis, 
        ninvoption, cinvremark, cinvremark1, ninvdp, xkirim, ninvclose, ninvvalue
    ) VALUES (
        ?, ?, STR_TO_DATE(?, '%d-%m-%Y'), CURDATE(), 
        STR_TO_DATE(?, '%d-%m-%Y'), ?, ?, ?, 
        ?, @cinvpk, ?, ?, 
        CONCAT(DATE_FORMAT(NOW(), '%d-%m-%Y %H:%i'), ' ', ?), 
        (SELECT soexpire FROM ymk2), 'SO', 'n/a', 
        '..rupiah...............', 1, 1, 1, 1, ' ', ' ', 0, 0, 0, ?
    );
    SELECT CAST(@cinvpk AS CHAR) AS InvoicePkNo;
    `;

      const invoiceParams = [
        body.invoice.invoiceNo,
        body.invoice.warehouse,
        body.invoice.date,
        body.invoice.date,
        body.invoice.customer.pk,
        body.invoice.customer.desc,
        body.invoice.customer.desc,
        body.invoice.salesman.pk || '..default..............',
        body.invoice.tax,
        body.invoice.loginUser,
        body.invoice.loginUser,
        body.payment.total
      ];
      const [_, invoiceResponse, pkres] = await this.genericRepository.query<any>(
        invoiceQuery,
        invoiceParams,
      );
      if (!invoiceResponse || invoiceResponse.affectedRows === 0) {
        return ResponseHelper.CreateResponse<any>(
          null,
          HttpStatus.INTERNAL_SERVER_ERROR,
          Constants.TRANSACTION_FAILURE,
        );
      }
      // Handle invoice response
      const invoicePkNo = pkres[0].InvoicePkNo;
      body.tableFormData = body.tableFormData.filter(item => parseInt(item.qty, 10) !== 0);
      console.log('--------------------');
      console.log('SalesOrderInvoice');
      console.table(body.tableFormData);
      for (let i = 0; i < body.tableFormData.length; i++) {
        const row = body.tableFormData[i];

        const detailQuery = `
                INSERT INTO porderdetail (
                    civdfkstk, civdcode, nivdqtyout, civdpk, civdfkinv, nivdprice,
                    nivdfactor, nivdzqtyout, nivdamount, nivdorder, civdunit, nivdstkppn,
                    civdmemo
                ) 
                SELECT ?, ?, ?, LEFT(SHA1(UUID()), 23),
                    ?, 
                    ?, sd.nstdfactor, ? * sd.nstdfactor,
                    ? * ?, ?, u.cunidesc, s.nstkppn, ' '
                FROM stockdetail sd
                LEFT JOIN unit u ON u.cunipk = sd.cstdfkuni
                LEFT JOIN stock s ON s.cstkpk = ?
                WHERE sd.cstdcode = ?
                LIMIT 1;
            `;

        const detailParams = [
          row.pk,
          row.stock_id_header,
          row.qty,
          invoicePkNo,
          row.price,
          row.qty,
          row.qty,
          row.price,
          i + 1,
          row.pk,
          row.stock_id_header,
        ];

        const detailResponse = await this.genericRepository.query<any>(
          detailQuery,
          detailParams,
        );
      }
      /**
       * Now Querying Data for Printing Sales Order Receipt...
       */
      const receiptQuery = `
      -- Master Query
      select cinvrefno,oleh,format(ninvfreight,0) as ninvfreight,LTRIM(RTRIM(csamdesc)) as csamdesc,pheader,pfooter,LTRIM(RTRIM(cwhsdesc)) as cwhsdesc
      ,format(ninvvalue,0) as ninvvalue,cinvfkentcode,
      sum(1) as total_item,format(sum(nivdqtyout),0) as total_qty,
      format(sum(nivdamount)*(1-ninvdisc1/100)*(1-ninvdisc2/100)*(1-ninvdisc3/100)-ninvdisc,0) as subtotal,
      format(sum(if(nivdstkppn=1,((nivdamount)*(1-ninvdisc1/100)*(1-ninvdisc2/100)*(1-ninvdisc3/100)-ninvdisc)*ninvtax/100,0)),0) as tax
      from porder
      inner join porderdetail on cinvpk=civdfkinv
      inner join stock on cstkpk=civdfkstk
      inner join salesman on cinvfksam=csampk
      inner join warehouse on cinvfkwhs=cwhspk
      inner join ymk
      where cinvpk=?
      group by cinvrefno,oleh,ninvfreight,csamdesc,pheader,pfooter,cwhsdesc,ninvvalue, cinvfkentcode;

      -- Detail Query
      select LTRIM(RTRIM(cstkdesc)) as cstkdesc,format(nivdqtyout,0) as qty,LTRIM(RTRIM(civdunit)) as civdunit
      ,format(nivdamount/nivdqtyout,0) as price,
      format(nivdamount,0) as amount
      from porder
      inner join porderdetail on cinvpk=civdfkinv
      inner join stock on cstkpk=civdfkstk
      where cinvpk=?;
`;
      const params = [invoicePkNo, invoicePkNo];
      const [receiptMasterResponse, receiptDetailResponse] = await this.genericRepository.query<any>(receiptQuery, params);
      console.log(`master response`);
      console.log(receiptMasterResponse);
      console.log(`detail response`);
      console.log(receiptDetailResponse);
      if (!receiptMasterResponse || (Array.isArray(receiptDetailResponse) && receiptDetailResponse.length === 0)) {
        return ResponseHelper.CreateResponse<any>(
          [],
          HttpStatus.OK,
          Constants.TRANSACTION_SUCCESS);
      }
      this.formatter.setWidth(this.printerConfig.getPrinterWidth())
      const receipt = await this.formatter.salesOrder(receiptMasterResponse, receiptDetailResponse);
      console.log(receipt);
      return ResponseHelper.CreateResponse<any>(
        receipt,
        HttpStatus.OK,
        Constants.TRANSACTION_SUCCESS,
      );
    } catch (error) {
      console.log(error);
      console.log('in my catch');
      if (error instanceof TransactionError) {
        return ResponseHelper.CreateResponse<any>(
          null,
          HttpStatus.BAD_REQUEST,
          error.message,
        );
      }
      const deleteInvoiceDetail = `Delete FROM porderdetail WHERE civdfkinv = (SELECT cinvpk FROM invoice WHERE cinvrefno = ? and cinvspecial = 'JL')`;
      await this.genericRepository.query<any>(
        deleteInvoiceDetail,
        [body.invoice.invoiceNo],
      );
      const deleteInvoice = `Delete FROM porder WHERE cinvrefno = ?`;
      await this.genericRepository.query<any>(
        deleteInvoice,
        [body.invoice.invoiceNo],
      );
      console.log
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.INTERNAL_SERVER_ERROR,
        Constants.TRANSACTION_FAILURE,
      );
    }
  }

  async posInvoice(user: string) {
    await this.genericRepository.query(`
        UPDATE ymk
        SET L_pos = '1000'
        WHERE TRIM(L_pos) NOT REGEXP '^[0-9]+$';
      `);

    // 2. Next, increment L_opname by 1 only if it's a numeric value.
    await this.genericRepository.query(`
        UPDATE ymk
        SET L_pos = CAST(CAST(TRIM(L_pos) AS UNSIGNED) + 1 AS CHAR)
        WHERE TRIM(L_pos) REGEXP '^[0-9]+$';
      `);
    const query = `
      SELECT
      (SELECT L_pos FROM ymk) AS InvoiceNo,
          DATE_FORMAT(CURDATE(), '%d-%m-%Y') AS 'Date',
          w.cwhspk as primarykey,
          (TRIM(w.cwhsdesc)) AS description,
          ('') AS Customer,
          ('') AS Salesman,
          (0) AS Service,
          (SELECT ppajak FROM ymk) AS Tax,
          ('') AS 'Table'
      FROM
          android2 a
      JOIN
          warehouse w ON w.cwhspk = a.candfkwhs
      WHERE
          canddesc = ?;
    `;

    const response = await this.genericRepository.query<any>(query, [user]);

    // Parse the Warehouse JSON string into an object
    const warehouse = { primaryKey: '', description: '' };
    const finalResponse = {
      InvoiceNo: '',
      Date: '',
      Warehouse: null,
      Customer: '',
      Salesman: '',
      Service: '',
      Tax: 0,
      Table: '',
    };
    if (response?.length) {
      finalResponse.InvoiceNo = response[0].InvoiceNo;
      finalResponse.Date = response[0].Date;
      finalResponse.Customer = response[0].Customer;
      finalResponse.Salesman = response[0].Salesman;
      finalResponse.Service = response[0].Service;
      finalResponse.Tax = response[0].Tax;
      finalResponse.Table = response[0].Table;
      warehouse.primaryKey = response[0].primarykey;
      warehouse.description = response[0].description;
      finalResponse.Warehouse = warehouse;

      return ResponseHelper.CreateResponse<any>(
        finalResponse,
        HttpStatus.OK,
        Constants.DATA_SUCCESS,
      );
    } else {
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.NOT_FOUND,
        Constants.LOCATION_NOT_FOUND,
      );
    }
  }

  async posTable(queryParams: any) {
    const { stockId } = queryParams;
    const query = `
      SELECT 
        nstkppn as taxable, 
        cstkpk as pk, 
        cstdcode as stock_id_header, 
        TRIM(cstkdesc) as stock_name, 
        nstdretail as price, 
        1 as qty 
      FROM 
        stockdetail d 
      JOIN 
        stock s ON s.cstkpk = d.cstdfkstk 
      WHERE 
        cstdcode = ?;
    `;

    const response =
      await this.genericRepository.query<TransactionSalesTableDto>(query, [
        stockId,
      ]);
    if (response?.length) {
      return ResponseHelper.CreateResponse<any>(
        response,
        HttpStatus.OK,
        Constants.DATA_SUCCESS,
      );
    } else {
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.NOT_FOUND,
        Constants.DATA_NOT_FOUND,
      );
    }
  }

  // Point Of Sales Transaction Processing
  async setPosInvoice(body: any) {
    try {
      const allQuantitiesZero = body.tableFormData.every((item: any) => parseInt(item.qty, 10) === 0);

      // If all quantities are zero, throw an error
      if (allQuantitiesZero) {
        throw new TransactionError(Constants.FILL_ORDER_ERROR);
      }
      const invoiceQuery = `
    SET @cinvpk := LEFT(SHA1(UUID()), 23);
    INSERT INTO invoice (
        cinvrefno, cinvfkwhs, dinvdate, dinvdue, dinvtaxdate, 
        cinvfkent, cinvfkentcode, cinvfksam, ninvtax, cinvmeja, 
        ninvvoucher, ninvtunai, ninvcredit, ninvdebit, ninvmobile, 
        ninvfreight, cINVpk, cinvuser, oleh, ninvjam, ninvvalue, ninvvalue1,
        cinvspecial, cinvtransfer, cinvfkexc, ninvrate, ninvratep, ninvcash,
        cinvremark, cinvremark1, ninvno_card, ninvjenis_card,ninvccard_nama,ninvccard_oto, cinvdine,
        cinvhadiah,cinvsedan, cinvsedancode, cinvfkkli, cinvfkpos, cinvfkcam, cinvpromog,
        ninvdp, ninvpiutang, ninvoption, ninvkembali, ninvpoint, ninvpax, ninvpromov,
        ninvpromod, ninvpromos, ninvkm, ninvwaste,ninvgratis
    ) VALUES (
        ?, ?, CURDATE(), CURDATE(), CURDATE(), 
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, @cinvpk,
        ?, CONCAT(DATE_FORMAT(NOW(), '%d-%m-%Y %H:%i'), ' ', ?),
        HOUR(NOW()), ?, ?,
        'PS', 'n/a',  '..rupiah...............', 1, 1, 1,
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        0, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0
    );
  
  SELECT CAST(@cinvpk AS CHAR) AS InvoicePkNo;
    `;

      // Map the parameters to the query
      const invoiceParams = [
        body.invoice.invoiceNo, // cinvrefno
        body.invoice.warehouse, // cinvfkwhs
        body.invoice.customer.pk || '', // cinvfkent
        body.invoice.customer.desc || '', // cinvfkentcode
        body.invoice.salesman.pk || '..default..............', // cinvfksam
        body.invoice.tax, // ninvtax
        body.invoice.table || ' ', // cinvmeja (Table)
        body.payment.voucher, // ninvvoucher (Voucher)
        body.payment.cash - body.payment.change, // ninvtunai (Cash payment)
        body.payment.creditCard, // ninvcredit (Credit Card payment)
        body.payment.debitCard, // ninvdebit (Debit Card payment)
        body.payment.online, // ninvmobile (Online payment)
        body.invoice.service, // ninvfreight (Service charge)
        body.invoice.loginUser, // cinvuser
        body.invoice.loginUser, // oleh
        body.payment.total,// ninvvalue (ninvvoucher+ninvtunai+ninvcredit+ninvdebit+ninvmobile)
        body.payment.total,// ninvvalue1 (ninvvoucher+ninvtunai+ninvcredit+ninvdebit+ninvmobile)
        body.payment.change
      ];
      const [_, invoiceResponse, pkres] = await this.genericRepository.query<any>(
        invoiceQuery,
        invoiceParams,
      );
      if (!invoiceResponse || invoiceResponse.affectedRows === 0) {
        return ResponseHelper.CreateResponse<any>(
          null,
          HttpStatus.INTERNAL_SERVER_ERROR,
          Constants.TRANSACTION_FAILURE,
        );
      }
      // Handle invoice response
      const invoicePkNo = pkres[0].InvoicePkNo;
      body.tableFormData = body.tableFormData.filter(item => parseInt(item.qty, 10) !== 0);
      console.log('--------------------');
      console.log('POSInvoice');
      console.table(body.tableFormData);
      for (let i = 0; i < body.tableFormData.length; i++) {
        const row = body.tableFormData[i];
        const qtyQuery = `
            select 
        sum(zqtyin-zqtyout) as Qty
        from
        (
        
        SELECT cIvdFkStk, cInvFkWhs as pkWhs,
        SUM(nIVDzqtyIn) as zQtyIn, SUM(nIVDzqtyout) as zQtyOut, 
        'a' as detailType FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial<>'KS' 
        and nivdaccqty>=0
        and cinvspecial<>'02' 
        group by cIvdFkStk, cInvFkWhs 
        
        union 
        
        SELECT cIvdFkStk, cInvTransfer as pkWhs,
        SUM(nIVDzqtyOut) as zQtyIn,
        SUM(nIVDzqtyIn) as zQtyOut, 
        't' as detailType FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial<>'KS'  
        and cInvTransfer <> 'n/a'
        and nIVDkirim=1 and cInvTransfer is not null
        and nivdaccqty>=0
        and cinvspecial<>'02'
        group by cIvdFkStk, cInvTransfer 
        
        ) as c
        
        inner join warehouse 
        on warehouse.cwhspk=c.pkwhs
        INNER JOIN stock 
        on cIvdFkStk=CSTKPK and nstksuspend=0 and nstkservice=0
        INNER JOIN stockdetail sdt 
        on cIvdFkStk=cSTDfkSTK And nSTDfactor=1 and nstdkey=1 
        INNER JOIN unit ON cSTDfkUNI=cUNIpk 
        where cstdcode=?
         and (IFNULL(?, cwhspk) = cwhspk or cwhspk is null)
        `;
        const qtyResponse = await this.genericRepository.query<any>(qtyQuery, [
          row.stock_id_header, body.invoice.warehouse
        ]);
        const qty = parseInt(qtyResponse[0].Qty) || 0;
        const detailQuery = `
                INSERT INTO invoicedetail (
    civdfkstk, civdcode, nivdonhand, nivdqtyout, qtyresep, civdpk, civdfkinv, nivdprice,
    nivdfactor, nivdzqtyout, nivdamount, nivdorder, civdunit, nivdstkppn,nivdkirim,
    civdmemo, nivdpokok, civdpromocard, civdresep
) 
SELECT ?, ?, ?, ?, ?, LEFT(SHA1(UUID()), 23), 
    ?, -- Subquery for civdfkinv
    ?, sd.nstdfactor, ? * sd.nstdfactor,
    ? * ?, ?, u.cunidesc, s.nstkppn, 1,' ', (select nstkbuy from stock where cstkpk= ?) * (? * sd.nstdfactor), ' ', ' '
FROM stockdetail sd
LEFT JOIN unit u ON u.cunipk = sd.cstdfkuni
LEFT JOIN stock s ON s.cstkpk = ?
WHERE sd.cstdcode = ?;

            `;

        const detailParams = [
          row.pk,              // civdfkstk
          row.stock_id_header, // civdcode
          qty,             // nivdonhand
          row.qty,             // nivdqtyout
          row.qty,             // qtyresep
          invoicePkNo, // cinvrefno (subquery in SELECT)
          row.price,           // nivdprice
          row.qty,             // quantity * nstdfactor
          row.qty,             // quantity
          row.price,           // nivdamount
          i + 1,               // nivdorder
          row.pk,
          row.qty,
          row.pk,              // s.cstkpk (to match stock in JOIN)
          row.stock_id_header, // sd.cstdcode
        ];

        const detailResponse = await this.genericRepository.query<any>(
          detailQuery,
          detailParams,
        );
      }

      /**
       * Now Querying Data for Printing Point Of Sales Receipt...
       */
      const receiptQuery = `
select LTRIM(RTRIM(cinvmeja)) as cinvmeja,cinvrefno,ninvdp,
format(ninvvoucher,0) as ninvvoucher,
format((ninvtunai+ninvkembali),0) as ninvtunai_ninvkembali,
ninvpiutang,
format(ninvcredit,0) as ninvcredit,format(ninvdebit,0) as ninvdebit,
format(ninvmobile,0) as ninvmobile,format(ninvkembali, 0) as ninvkembali,format(ninvvalue, 0) as ninvvalue,oleh,
format(ninvfreight,0) as ninvfreight,LTRIM(RTRIM(csamdesc)) as csamdesc,LTRIM(RTRIM(pheader)) as pheader,
LTRIM(RTRIM(pfooter)) as pfooter,LTRIM(RTRIM(cwhsdesc)) as cwhsdesc,
sum(1) as total_item,format(sum(nivdqtyout),0) as total_qty,
sum(1) as total_item,format(sum(nivdqtyout),0) as total_qty,
format(sum(nivdamount)*(1-ninvdisc1/100)*(1-ninvdisc2/100)*(1-ninvdisc3/100)-ninvdisc,0) as subtotal,
format(sum(if(nivdstkppn=1,((nivdamount)*(1-ninvdisc1/100)*(1-ninvdisc2/100)*(1-ninvdisc3/100)-ninvdisc)*ninvtax/100,0)),0) as tax,
LTRIM(RTRIM(cinvfkentcode)) as cinvfkentcode
from invoice
inner join invoicedetail on cinvpk=civdfkinv
inner join stock on cstkpk=civdfkstk
inner join salesman on cinvfksam=csampk
inner join warehouse on cinvfkwhs=cwhspk
inner join ymk
where cinvpk=?
group by cinvmeja,cinvrefno,ninvdp,ninvvoucher,ninvtunai+ninvkembali,ninvpiutang,ninvcredit,ninvdebit,ninvmobile,ninvkembali,ninvvalue,oleh,ninvfreight,csamdesc,pheader,pfooter,cwhsdesc;

select LTRIM(RTRIM(cstkdesc)) as cstkdesc,format(nivdqtyout,0) as qty,LTRIM(RTRIM(civdunit)) as civdunit,
format(nivdamount/nivdqtyout,0) as price,
format(nivdamount,0) as amount
from invoice
inner join invoicedetail on cinvpk=civdfkinv
inner join stock on cstkpk=civdfkstk
where cinvpk=?;

      `;
      const params = [invoicePkNo, invoicePkNo];
      const [receiptMasterResponse, receiptDetailResponse] = await this.genericRepository.query<any>(receiptQuery, params);
      console.log(`master response`);
      console.log(receiptMasterResponse);
      console.log(`detail response`);
      console.log(receiptDetailResponse);
      if (!receiptMasterResponse || (Array.isArray(receiptDetailResponse) && receiptDetailResponse.length === 0)) {
        return ResponseHelper.CreateResponse<any>(
          [],
          HttpStatus.OK,
          Constants.TRANSACTION_SUCCESS);
      }
      this.formatter.setWidth(this.printerConfig.getPrinterWidth());
      const receipt = await this.formatter.pointOfSales(receiptMasterResponse, receiptDetailResponse);
      console.log(receipt);
      return ResponseHelper.CreateResponse<any>(
        receipt,
        HttpStatus.OK,
        Constants.TRANSACTION_SUCCESS,
      );
    } catch (error) {
      console.log(`hi from catch`);
      console.log(error);
      if (error instanceof TransactionError) {
        return ResponseHelper.CreateResponse<any>(
          null,
          HttpStatus.BAD_REQUEST,
          error.message,
        );
      }
      const deleteInvoiceDetail = `Delete FROM invoicedetail WHERE civdfkinv = (SELECT cinvpk FROM invoice WHERE cinvrefno = ? and cinvspecial = 'JL')`;
      await this.genericRepository.query<any>(
        deleteInvoiceDetail,
        [body.invoice.invoiceNo],
      );
      const deleteInvoice = `Delete FROM invoice WHERE cinvrefno = ?`;
      await this.genericRepository.query<any>(
        deleteInvoice,
        [body.invoice.invoiceNo],
      );
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.INTERNAL_SERVER_ERROR,
        Constants.TRANSACTION_FAILURE,
      );
    }
  }

  async stockInvoice(user: string) {
    await this.genericRepository.query(`
        UPDATE ymk
        SET L_opname = '1000'
        WHERE TRIM(L_opname) NOT REGEXP '^[0-9]+$';
      `);

    // 2. Next, increment L_opname by 1 only if it's a numeric value.
    await this.genericRepository.query(`
        UPDATE ymk
        SET L_opname = CAST(CAST(TRIM(L_opname) AS UNSIGNED) + 1 AS CHAR)
        WHERE TRIM(L_opname) REGEXP '^[0-9]+$';
      `);
    const query = `
    SELECT
        (SELECT L_opname FROM ymk) AS InvoiceNo,
        DATE_FORMAT(CURDATE(), '%d-%m-%Y') AS 'Date',
        w.cwhspk as primarykey,
        (TRIM(w.cwhsdesc)) AS description
    FROM android2 a
    JOIN
        warehouse w ON w.cwhspk = a.candfkwhs
    WHERE
        canddesc = ?;
  `;

    const response = await this.genericRepository.query<any>(query, [user]);

    // Parse the Warehouse JSON string into an object
    const warehouse = { primaryKey: '', description: '' };
    const finalResponse = {
      InvoiceNo: '',
      Date: '',
      Warehouse: null,
    };
    if (response?.length) {
      finalResponse.InvoiceNo = response[0].InvoiceNo;
      finalResponse.Date = response[0].Date;
      warehouse.primaryKey = response[0].primarykey;
      warehouse.description = response[0].description;
      finalResponse.Warehouse = warehouse;

      return ResponseHelper.CreateResponse<any>(
        finalResponse,
        HttpStatus.OK,
        Constants.DATA_SUCCESS,
      );
    } else {
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.NOT_FOUND,
        Constants.LOCATION_NOT_FOUND,
      );
    }
  }

  async stockTable(queryParams: any) {
    const { stockId } = queryParams;
    const query = `
    SELECT 
      cstkpk as pk, 
      cstdcode as stock_id_header, 
      TRIM(cstkdesc) as stock_name, 
      1 as qty 
    FROM 
      stockdetail d 
    JOIN 
      stock s ON s.cstkpk = d.cstdfkstk 
    WHERE 
      cstdcode = ? and nstdfactor=1;
  `;

    const response =
      await this.genericRepository.query<TransactionSalesTableDto>(query, [
        stockId,
      ]);

    if (response?.length) {
      return ResponseHelper.CreateResponse<any>(
        response,
        HttpStatus.OK,
        Constants.DATA_SUCCESS,
      );
    } else {
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.NOT_FOUND,
        Constants.DATA_NOT_FOUND,
      );
    }
  }

  // Stock Adjustment Transaction Processing
  async setStockInvoice(body: any) {
    console.log('stock adjustment');
    console.log(body);
    try {
      const invoiceQuery = `
SET @cinvpk := LEFT(SHA1(UUID()), 23);

  INSERT INTO invoice (
      cinvrefno, cinvfkwhs,
      dinvdate, dinvdue, dinvtaxdate, dinvtglsj,
      cinvpk, cinvuser, oleh,
      cinvfkent, cinvfksam, cinvspecial, cinvfkexc,
      cinvfkentcode,  kunci, ninvrate, ninvratep,
       cinvserie, cinvtaxinv, cinvpo, cinvremark,
      xkirim
  ) VALUES (
      ?, ?,
      STR_TO_DATE(?, '%d-%m-%Y'), STR_TO_DATE(?, '%d-%m-%Y'), STR_TO_DATE(?, '%d-%m-%Y'), STR_TO_DATE(?, '%d-%m-%Y'),
      @cinvpk, ?, CONCAT(DATE_FORMAT(NOW(), '%d-%m-%Y %H:%i'), ' ', ?),
       '..opname...............',  '..default..............',  'OP', '..rupiah...............',
       'OPNAME', 1, 1, 1,
        '','','','',
        0
  );
  
  SELECT CAST(@cinvpk AS CHAR) AS InvoicePkNo;
  `;

      const invoiceParams = [
        body.invoice.invoiceNo,
        body.invoice.warehouse,
        body.invoice.date,
        body.invoice.date,
        body.invoice.date,
        body.invoice.date,
        body.invoice.loginUser,
        body.invoice.loginUser,
      ];
      const [_, invoiceResponse, pkres] = await this.genericRepository.query<any>(
        invoiceQuery,
        invoiceParams,
      );
      if (!invoiceResponse || invoiceResponse.affectedRows === 0) {
        return ResponseHelper.CreateResponse<any>(
          null,
          HttpStatus.INTERNAL_SERVER_ERROR,
          Constants.TRANSACTION_FAILURE,
        );
      }
      const invoicePkNo = pkres[0].InvoicePkNo;
      console.log('---------------------------');
      console.log('Stock Adjustment Invoice');
      console.table(body.tableFormData);

      /*
        Merging the same items as per client request.
      */

      const map = new Map();

      for (const item of body.tableFormData) {
        const key = `${item.pk}`;

        if (!map.has(key)) {
          map.set(key, {
            ...item,
            qty: parseFloat(item.qty)
          });
        } else {
          const existing = map.get(key);
          existing.qty += parseFloat(item.qty);
        }
      }

      const result = Array.from(map.values());
      for (let i = 0; i < result.length; i++) {
        const row = result[i];
        const qtyQuery = `
            select 
        sum(zqtyin-zqtyout) as Qty
        from
        (
        
        SELECT cIvdFkStk, cInvFkWhs as pkWhs,
        SUM(nIVDzqtyIn) as zQtyIn, SUM(nIVDzqtyout) as zQtyOut, 
        'a' as detailType FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial<>'KS' 
        and nivdaccqty>=0
        and cinvspecial<>'02' 
        group by cIvdFkStk, cInvFkWhs 
        
        union 
        
        SELECT cIvdFkStk, cInvTransfer as pkWhs,
        SUM(nIVDzqtyOut) as zQtyIn,
        SUM(nIVDzqtyIn) as zQtyOut, 
        't' as detailType FROM Invoicedetail
        INNER JOIN Invoice ON cIVDfkINV = cINVpk
        WHERE cinvspecial<>'KS'  
        and cInvTransfer <> 'n/a'
        and nIVDkirim=1 and cInvTransfer is not null
        and nivdaccqty>=0
        and cinvspecial<>'02'
        group by cIvdFkStk, cInvTransfer 
        
        ) as c
        
        inner join warehouse 
        on warehouse.cwhspk=c.pkwhs
        INNER JOIN stock 
        on cIvdFkStk=CSTKPK and nstksuspend=0 and nstkservice=0
        INNER JOIN stockdetail sdt 
        on cIvdFkStk=cSTDfkSTK And nSTDfactor=1 and nstdkey=1 
        INNER JOIN unit ON cSTDfkUNI=cUNIpk 
        where cstdcode=? and (IFNULL(?, cwhspk) = cwhspk or cwhspk is null)
        `;
        const qtyResponse = await this.genericRepository.query<any>(qtyQuery, [
          row.stock_id_header, body.invoice.warehouse
        ]);
        const qty = parseInt(qtyResponse[0].Qty) || 0;
        const nivdqtyin = qty < row.qty ? row.qty - qty : 0;
        const nivdzqtyin = qty < row.qty ? row.qty - qty : 0;
        const nivdqtyout = qty >= row.qty ? qty - row.qty : 0;
        const nivdzqtyout = qty >= row.qty ? qty - row.qty : 0;
        const nivdamount = row.qty - qty;
        const detailQuery = `
            INSERT INTO invoicedetail (
              civdfkstk, civdcode, nivdonhand, nivdadjust, nivdkirim,
              civdpk, civdfkinv, nivdprice, 
              nivdqtyin, nivdzqtyin, nivdqtyout, nivdzqtyout,
              nivdamount, nivdorder, civdunit, 
              nivdstkppn, nivdfactor,
              civdsn, civdmemo, civdfkstk1, disct
            ) Values (
              ?, ?, ?, ?, 1,
              LEFT(SHA1(UUID()), 23), ?,
              (SELECT nstkbuy FROM stock WHERE cstkpk = ?),
              ?, ?, ?, ?,
              (? * (SELECT nstkbuy FROM stock WHERE cstkpk = ?)), ?,
              (SELECT cunidesc FROM unit WHERE cunipk = (SELECT cstdfkuni FROM stockdetail WHERE nstdfactor=1 AND cstdfkstk = ?)), 
              1, 1,
              '', '', '', ''
            )
        `;

        const detailParams = [
          row.pk, row.stock_id_header, qty,
          row.qty, invoicePkNo, row.pk,
          nivdqtyin, nivdzqtyin, nivdqtyout, nivdzqtyout,  // Pre-calculated values
          nivdamount, row.pk, i + 1,  // nivdamount and sequence number
          row.pk  // Stock PK for retrieving unit information
        ];


        const detailResponse = await this.genericRepository.query<any>(
          detailQuery,
          detailParams,
        );
      }

      /*
        Now Querying Data for printing receipt...
      */
      const receiptQuery = "select cinvrefno,oleh,cstkdesc,format(nivdadjust,0) as qty,civdunit,cwhsdesc " +
        " from invoice " +
        " inner join invoicedetail on cinvpk=civdfkinv " +
        " inner join stock on cstkpk=civdfkstk " +
        " inner join warehouse on cinvfkwhs=cwhspk " +
        " where cinvpk= ? ";
      const params = [invoicePkNo];
      const receiptResponse = await this.genericRepository.query<any>(receiptQuery, params);
      if (!receiptResponse || (Array.isArray(receiptResponse) && receiptResponse.length === 0)) {
        return ResponseHelper.CreateResponse<any>(
          [],
          HttpStatus.OK,
          Constants.TRANSACTION_SUCCESS);
      }
      this.formatter.setWidth(this.printerConfig.getPrinterWidth());
      const receipt = await this.formatter.stockAdjustment(receiptResponse);
      console.log('stock adjustment receipt:');
      console.log(receipt);
      return ResponseHelper.CreateResponse<any>(
        receipt,
        HttpStatus.OK,
        Constants.TRANSACTION_SUCCESS,
      );
    } catch (error) {
      console.log(error);
      if (error instanceof TransactionError) {
        return ResponseHelper.CreateResponse<any>(
          null,
          HttpStatus.BAD_REQUEST,
          error.message,
        );
      }
      const deleteInvoiceDetail = `Delete FROM invoicedetail WHERE civdfkinv = (SELECT cinvpk FROM invoice WHERE cinvrefno = ? and cinvspecial = 'JL')`;
      await this.genericRepository.query<any>(
        deleteInvoiceDetail,
        [body.invoice.invoiceNo],
      );
      const deleteInvoice = `Delete FROM invoice WHERE cinvrefno = ?`;
      await this.genericRepository.query<any>(
        deleteInvoice,
        [body.invoice.invoiceNo],
      );
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.INTERNAL_SERVER_ERROR,
        Constants.TRANSACTION_FAILURE,
      );
    }
  }
}
