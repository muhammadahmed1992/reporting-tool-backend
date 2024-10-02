import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import { ReportFactory } from './../factory/report-factory';
import ApiResponse from 'src/helper/api-response';
import { GenericRepository } from 'src/repository/generic.repository';
import { TransactionSalesDto } from '../dto/transaction-sales.dto';
import ResponseHelper from 'src/helper/response-helper';
import Constants from 'src/helper/constants';
import { TransactionSalesTableDto } from 'src/dto/transaction-sales-table.dto';
import { TransactionSalesInvoiceDTO } from 'src/dto/transaction-sales-invoice.dto';
import { Table } from 'typeorm';

@Injectable({ scope: Scope.REQUEST })
export class TransactionModuleService {
  constructor(private readonly genericRepository: GenericRepository) {}

  async salesInvoice(user: string) {
    console.log(user);
    const query = `
      SELECT
          (SELECT L_jual FROM ymk) AS InvoiceNo,
          DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS 'Date',
          w.cwhspk as primarykey,
          (TRIM(w.cwhsdesc)) AS description,
          ('') AS Customer,
          ('') AS Salesman,
          (SELECT gst FROM ymk3) AS Tax
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
      console.log(finalResponse);
      warehouse.primaryKey = response[0].primarykey;
      warehouse.description = response[0].description;
      finalResponse.Warehouse = warehouse;
      // const parsedResponse = response.map((item) => ({
      //   InvoiceNo : ,
      //   Warehouse: warehouse
      // }));

      return ResponseHelper.CreateResponse<any>(
        finalResponse,
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
    console.log(response);

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

  async setSalesInvoice(body: any) {
    console.log(body);

    // Insert invoice details first
    const invoiceQuery = `
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
        ninvpawal, ninvcetak1, ninvpilih, ninvpersen, xkirim, ninvvalue
    ) VALUES (
        ?, ?, STR_TO_DATE(?, '%Y-%m-%d'), CURDATE(), 
        STR_TO_DATE(?, '%Y-%m-%d'), ?, ?, ?, 
        ?, LEFT(SHA1(UUID()), 23), ?, ?, 
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
        ?
    )`;

    const invoiceParams = [
      body.invoice.invoiceNo,
      body.invoice.warehouse,
      body.invoice.date,
      body.invoice.date,
      body.invoice.customer.pk,
      body.invoice.customer.desc,
      body.invoice.customer.desc,
      body.invoice.salesman.pk,
      body.invoice.tax,
      body.invoice.loginUser,
      body.invoice.loginUser,
      body.invoice.invoiceNo - 10000,
    ];

    try {
      const invoiceResponse = await this.genericRepository.query<any>(
        invoiceQuery,
        invoiceParams,
      );
      const invoicePK = body.invoiceNo;

      for (let i = 0; i < body.tableFormData.length; i++) {
        const row = body.tableFormData[i];

        const detailQuery = `
                INSERT INTO invoicedetail (
                    civdfkstk, civdcode, nivdqtyout, civdpk, civdfkinv, nivdprice,
                    nivdfactor, nivdzqtyout, nivdamount, nivdorder, civdunit, nivdstkppn,
                    civdsn, civdmemo
                ) 
                SELECT ?, ?, ?, LEFT(SHA1(UUID()), 23),
                    (SELECT cinvpk FROM invoice WHERE cinvrefno = ? cinvspecial = 'SO'), 
                    ?, sd.nstdfactor, ? * sd.nstdfactor,
                    ? * ?, ?, u.cunidesc, s.nstkppn, ' ', ' '
                FROM stockdetail sd
                LEFT JOIN unit u ON u.cunipk = sd.cstdfkuni
                LEFT JOIN stock s ON s.cstkpk = ?
                WHERE sd.cstdcode = ?
            `;

        const detailParams = [
          row.pk,
          row.stock_id_header,
          row.qty,
          body.invoiceNo,
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

      const updateQuery = `UPDATE ymk SET L_jual = L_jual + 1;`;
      await this.genericRepository.query<any>(updateQuery);

      return ResponseHelper.CreateResponse<any>(
        'Invoice and details inserted successfully.',
        HttpStatus.OK,
        Constants.DATA_SUCCESS,
      );
    } catch (error) {
      console.error('Error inserting invoice or details:', error);

      return ResponseHelper.CreateResponse<any>(
        'Failed to insert invoice or details.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        Constants.DATA_FAILURE,
      );
    }
  }

  async salesOrderInvoice(user: string) {
    const query = `
      SELECT
          (SELECT L_so FROM ymk) AS InvoiceNo,
          DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS 'Date',
          w.cwhspk as primarykey,
          (TRIM(w.cwhsdesc)) AS description,
          ('') AS Customer,
          ('') AS Salesman,
          (SELECT gst FROM ymk3) AS Tax
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
      console.log(finalResponse);
      warehouse.primaryKey = response[0].primarykey;
      warehouse.description = response[0].description;
      finalResponse.Warehouse = warehouse;
      // const parsedResponse = response.map((item) => ({
      //   InvoiceNo : ,
      //   Warehouse: warehouse
      // }));

      return ResponseHelper.CreateResponse<any>(
        finalResponse,
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
    console.log(response);

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

  async setSalesOrderInvoice(body: any) {
    const invoiceQuery = `
    INSERT INTO porder (
        cinvrefno, cinvfkwhs, dinvdate, dinvdue, dinvtaxdate, 
        cinvfkent, cinvfkentcode, cinvhadiah, cinvfksam, cinvpk, 
        ninvtax, cinvuser, oleh, ninvexpire, cinvspecial, 
        cinvtransfer, cinvfkexc, kunci, ninvrate, ninvjenis, 
        ninvoption, cinvremark, cinvremark1, ninvdp, xkirim, ninvclose
    ) VALUES (
        ?, ?, STR_TO_DATE(?, '%Y-%m-%d'), CURDATE(), 
        STR_TO_DATE(?, '%Y-%m-%d'), ?, ?, ?, 
        ?, LEFT(SHA1(UUID()), 23), ?, ?, 
        CONCAT(DATE_FORMAT(NOW(), '%d-%m-%Y %H:%i'), ' ', ?), 
        (SELECT soexpire FROM ymk2), 'SO', 'n/a', 
        '..rupiah...............', 1, 1, 1, 1, ' ', ' ', 0, 0, 0
    )`;

    const invoiceParams = [
      body.invoice.invoiceNo,
      body.invoice.warehouse,
      body.invoice.date,
      body.invoice.date,
      body.invoice.customer.pk,
      body.invoice.customer.desc,
      body.invoice.customer.desc,
      body.invoice.salesman.pk,
      body.invoice.tax,
      body.invoice.loginUser,
      body.invoice.loginUser,
    ];

    try {
      const invoiceResponse = await this.genericRepository.query<any>(
        invoiceQuery,
        invoiceParams,
      );
      const invoicePK = body.invoiceNo;

      for (let i = 0; i < body.tableFormData.length; i++) {
        const row = body.tableFormData[i];

        const detailQuery = `
                INSERT INTO porderdetail (
                    civdfkstk, civdcode, nivdqtyout, civdpk, civdfkinv, nivdprice,
                    nivdfactor, nivdzqtyout, nivdamount, nivdorder, civdunit, nivdstkppn,
                    civdmemo
                ) 
                SELECT ?, ?, ?, LEFT(SHA1(UUID()), 23),
                    (SELECT cinvpk FROM porder WHERE cinvrefno = ? and cinvspecial = 'JL'), 
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
          body.invoice.invoiceNo,
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

      const updateQuery = `UPDATE ymk SET L_so = L_so + 1;`;
      await this.genericRepository.query<any>(updateQuery);

      return ResponseHelper.CreateResponse<any>(
        'Invoice and details inserted successfully.',
        HttpStatus.OK,
        Constants.DATA_SUCCESS,
      );
    } catch (error) {
      console.error('Error inserting invoice or details:', error);

      return ResponseHelper.CreateResponse<any>(
        'Failed to insert invoice or details.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        Constants.DATA_FAILURE,
      );
    }
  }

  async posInvoice(user: string) {
    console.log(user);
    const query = `
      SELECT
          (SELECT L_pos FROM ymk) AS InvoiceNo,
          DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS 'Date',
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
      console.log(finalResponse);
      warehouse.primaryKey = response[0].primarykey;
      warehouse.description = response[0].description;
      finalResponse.Warehouse = warehouse;
      // const parsedResponse = response.map((item) => ({
      //   InvoiceNo : ,
      //   Warehouse: warehouse
      // }));

      return ResponseHelper.CreateResponse<any>(
        finalResponse,
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
    console.log(response);

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
  async setPosInvoice(body: any) {
    const invoiceQuery = `
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
        ?, ?, ?, ?, ?, ?, LEFT(SHA1(UUID()), 23),
        ?, CONCAT(DATE_FORMAT(NOW(), '%d-%m-%Y %H:%i'), ' ', ?),
        HOUR(NOW()), ? + ? + ? + ?, ? + ? + ? + ?,
        'PS', 'n/a',  '..rupiah...............', 1, 1, 1,
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    )
    `;

    // Map the parameters to the query
    const invoiceParams = [
      body.invoice.invoiceNo, // cinvrefno
      body.invoice.warehouse, // cinvfkwhs
      body.invoice.customer.pk, // cinvfkent
      body.invoice.customer.desc, // cinvfkentcode
      body.invoice.salesman.pk, // cinvfksam
      body.invoice.tax, // ninvtax
      body.invoice.table || ' ', // cinvmeja (Table)
      body.payment.voucher || 0, // ninvvoucher (Voucher)
      body.payment.cash || 0, // ninvtunai (Cash payment)
      body.payment.creditCard || 0, // ninvcredit (Credit Card payment)
      body.payment.debitCard || 0, // ninvdebit (Debit Card payment)
      body.payment.online || 0, // ninvmobile (Online payment)
      body.invoice.service || 0, // ninvfreight (Service charge)
      body.invoice.loginUser, // cinvuser
      body.invoice.loginUser, // oleh
      body.payment.cash || 0,
      body.payment.voucher || 0,
      body.payment.creditCard || 0,
      body.payment.debitCard || 0,
      body.payment.online || 0,
      body.invoice.service || 0, // ninvvalue (ninvvoucher+ninvtunai+ninvcredit+ninvdebit+ninvmobile)
      body.payment.cash || 0,
      body.payment.voucher || 0,
      body.payment.creditCard || 0,
      body.payment.debitCard || 0,
      body.payment.online || 0,
      body.invoice.service || 0, // ninvvalue1 (ninvvoucher+ninvtunai+ninvcredit+ninvdebit+ninvmobile)
    ];

    try {
      const invoiceResponse = await this.genericRepository.query<any>(
        invoiceQuery,
        invoiceParams,
      );
      // Handle invoice response
      const invoicePK = body.invoiceNo;

      for (let i = 0; i < body.tableFormData.length; i++) {
        const row = body.tableFormData[i];
        const balanceQuery = `
            SELECT 
                ROUND(SUM((zqtyin - zqtyout) * nstdprice), 2) AS Balance
            FROM (
                SELECT 
                    cIvdFkStk, 
                    SUM(nIVDzqtyIn) AS zQtyIn, 
                    SUM(nIVDzqtyOut) AS zQtyOut,
                    SUM(nIVDzqtyIn * nSTDprice) AS nstdprice
                FROM Invoicedetail
                INNER JOIN Invoice ON cIVDfkINV = cINVpk
                INNER JOIN stockdetail ON cIvdFkStk = cSTDfkSTK AND nSTDfactor = 1 AND nstdkey = 1
                WHERE 
                    cinvspecial <> 'KS' 
                    AND nivdaccqty >= 0
                    AND cinvspecial <> '02'
                
                UNION 
                
                SELECT 
                    cIvdFkStk, 
                    SUM(nIVDzqtyOut) AS zQtyIn,
                    SUM(nIVDzqtyIn) AS zQtyOut,
                    SUM(nIVDzqtyOut * nSTDprice) AS nstdprice
                FROM Invoicedetail
                INNER JOIN Invoice ON cIVDfkINV = cINVpk
                INNER JOIN stockdetail ON cIvdFkStk = cSTDfkSTK AND nSTDfactor = 1 AND nstdkey = 1
                WHERE 
                    cinvspecial <> 'KS'  
                    AND cInvTransfer <> 'n/a'
                    AND nIVDkirim = 1 
                    AND cInvTransfer IS NOT NULL
                    AND nivdaccqty >= 0
                    AND cinvspecial <> '02'
                    AND cstdcode = ?
            ) AS c
        `;
      const balanceResponse = await this.genericRepository.query<any>(balanceQuery, [
        row.stock_id_header,
      ]);
        const  balance = parseInt(balanceResponse[0].Balance);
        const detailQuery = `
                INSERT INTO invoicedetail (
                    civdfkstk, civdcode, nivdonhand, nivdqtyout, qtyresep, civdpk, civdfkinv, nivdprice,
                    nivdfactor, nivdzqtyout, nivdamount, nivdorder, civdunit, nivdstkppn,
                    nivdpokok, civdmemo, civdpromocard, civdresep
                ) 
                SELECT ?, ?, ?, ?, ?, ?, ? LEFT(SHA1(UUID()), 23),
                    (SELECT cinvpk FROM invoice WHERE cinvrefno = ? and cinvspecial = 'PS'), 
                    ?, sd.nstdfactor, ? * sd.nstdfactor,
                    ? * ?, ?, u.cunidesc, s.nstkppn, 0, ' ', ' ', ' '
                FROM stockdetail sd
                LEFT JOIN unit u ON u.cunipk = sd.cstdfkuni
                LEFT JOIN stock s ON s.cstkpk = ?
                WHERE sd.cstdcode = ?
            `;

        const detailParams = [
          row.pk,
          row.stock_id_header,
          balance,
          row.qty,
          row.qty,
          body.invoiceNo,
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
      await this.genericRepository.query<any>(
        `Update ymk Set L_pos = L_pos + 1;`,
      );
    } catch (error) {
      // Handle error
    }
  }

  async stockInvoice(user: string) {
    console.log(user);
    const query = `
    SELECT
        (SELECT L_opname FROM ymk) AS InvoiceNo,
        DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS 'Date',
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
      console.log(finalResponse);
      warehouse.primaryKey = response[0].primarykey;
      warehouse.description = response[0].description;
      finalResponse.Warehouse = warehouse;
      // const parsedResponse = response.map((item) => ({
      //   InvoiceNo : ,
      //   Warehouse: warehouse
      // }));

      return ResponseHelper.CreateResponse<any>(
        finalResponse,
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
      cstdcode = ?;
  `;

    const response =
      await this.genericRepository.query<TransactionSalesTableDto>(query, [
        stockId,
      ]);
    console.log(response);

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

  async setStockInvoice(body: any) {
    console.log(body.invoice.invoiceNo);
    const invoiceQuery = `
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
      ?, ?, ?, ?,
      LEFT(SHA1(UUID()), 23), ?, CONCAT(DATE_FORMAT(NOW(), '%d-%m-%Y %H:%i'), ' ', ?),
       '..opname...............',  '..default..............',  'OP', '..rupiah...............',
       'OPNAME', 1, 1, 1,
        '','','','',
        0
  );
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
    console.log(invoiceQuery);
    try {
      const invoiceResponse = await this.genericRepository.query<any>(
        invoiceQuery,
        invoiceParams,
      );

      for (let i = 0; i < body.tableFormData.length; i++) {
        const row = body.tableFormData[i];
        const balanceQuery = `
          SELECT
              ROUND(SUM((zqtyin - zqtyout) * nstdprice), 2) AS Balance
          FROM (
              SELECT
                  cIvdFkStk,
                  SUM(nIVDzqtyIn) AS zQtyIn,
                  SUM(nIVDzqtyOut) AS zQtyOut,
                  SUM(nIVDzqtyIn * nSTDprice) AS nstdprice
              FROM Invoicedetail
              INNER JOIN Invoice ON cIVDfkINV = cINVpk
              INNER JOIN stockdetail ON cIvdFkStk = cSTDfkSTK AND nSTDfactor = 1 AND nstdkey = 1
              WHERE
                  cinvspecial <> 'KS'
                  AND nivdaccqty >= 0
                  AND cinvspecial <> '02'

              UNION

              SELECT
                  cIvdFkStk,
                  SUM(nIVDzqtyOut) AS zQtyIn,
                  SUM(nIVDzqtyIn) AS zQtyOut,
                  SUM(nIVDzqtyOut * nSTDprice) AS nstdprice
              FROM Invoicedetail
              INNER JOIN Invoice ON cIVDfkINV = cINVpk
              INNER JOIN stockdetail ON cIvdFkStk = cSTDfkSTK AND nSTDfactor = 1 AND nstdkey = 1
              WHERE
                  cinvspecial <> 'KS'
                  AND cInvTransfer <> 'n/a'
                  AND nIVDkirim = 1
                  AND cInvTransfer IS NOT NULL
                  AND nivdaccqty >= 0
                  AND cinvspecial <> '02'
                  AND cstdcode = ?
          ) AS c
      `;
      const balanceResponse = await this.genericRepository.query<any>(balanceQuery, [
        row.stock_id_header,
      ]);
      const balance = parseInt(balanceResponse[0].Balance);
      console.log(balance);
      
        const nivdqtyin = balance < row.qty ? row.qty - balance : 0;
        const nivdzqtyin = balance < row.qty ? row.qty - balance : 0;
        const nivdqtyout = balance >= row.qty ? balance - row.qty : 0;
        const nivdzqtyout = balance >= row.qty ? balance - row.qty : 0;
        const nivdamount = row.qty - balance; 
        
        const detailQuery = `
            INSERT INTO invoicedetail (
              civdfkstk, civdcode, nivdonhand, nivdadjust, 
              civdpk, civdfkinv, nivdprice, 
              nivdqtyin, nivdzqtyin, nivdqtyout, nivdzqtyout,
              nivdamount, nivdorder, civdunit
            ) Values (
              ?, ?, ?, ?, 
              LEFT(SHA1(UUID()), 23), ((SELECT cinvpk FROM invoice WHERE cinvrefno = ? and cinvspecial = 'OP')),
              (SELECT nstkbuy FROM stock WHERE cstkpk = ?),
              ?, ?, ?, ?,
              (? * (SELECT nstkbuy FROM stock WHERE cstkpk = ?)), ?,
              (SELECT cunidesc FROM unit WHERE cunipk = (SELECT cstdfkuni FROM stockdetail WHERE nstdfactor=1 AND cstdfkstk = ?))
            )
        `;
        
        const detailParams = [
          row.pk, row.stock_id_header, balance, 
          row.qty, body.invoiceNo, row.pk, 
          nivdqtyin, nivdzqtyin, nivdqtyout, nivdzqtyout,  // Pre-calculated values
          nivdamount, row.pk, i + 1,  // nivdamount and sequence number
          row.pk  // Stock PK for retrieving unit information
        ];
        

        const detailResponse = await this.genericRepository.query<any>(
          detailQuery,
          detailParams,
        );
      }
      await this.genericRepository.query<any>(
        `Update ymk Set L_opname = L_opname + 1;`,
      );
    } catch (error) {
      console.error(error);
    }
  }
}
