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
    
    await this.genericRepository.query(`
      UPDATE ymk
      SET L_jual = 1000
      WHERE L_jual NOT REGEXP '^[0-9]+$';`);
    const updateQuery = `UPDATE ymk SET L_jual = L_jual + 1;`;
    await this.genericRepository.query<any>(updateQuery);
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
        ninvpawal, ninvcetak1, ninvpilih, ninvpersen, xkirim, nivdtime, ninvvalue, cinvtambah 
    ) VALUES (
        ?, ?, STR_TO_DATE(?, '%d-%m-%Y'), CURDATE(), 
        STR_TO_DATE(?, '%d-%m-%Y'), ?, ?, ?, 
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
        CURDATE(), -- nivdtime
        ?,
        '01' -- cinvtambah
    )`;

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

    try {
      const invoiceResponse = await this.genericRepository.query<any>(
        invoiceQuery,
        invoiceParams,
      );

      for (let i = 0; i < body.tableFormData.length; i++) {
        const row = body.tableFormData[i];

        const detailQuery = `
                INSERT INTO invoicedetail (
                    civdfkstk, civdcode, nivdqtyout, civdpk, civdfkinv, nivdprice,
                    nivdfactor, nivdzqtyout, nivdamount, nivdorder, civdunit, nivdstkppn,
                    civdsn, civdmemo, nivdpokok
                ) 
                SELECT ?, ?, ?, LEFT(SHA1(UUID()), 23),
                    (SELECT cinvpk FROM invoice WHERE cinvrefno = ? and cinvspecial = 'JL'), 
                    ?, sd.nstdfactor, ? * sd.nstdfactor,
                    ? * ?, ?, u.cunidesc, s.nstkppn, ' ', ' ', (select nstkbuy from stock where cstkpk= ?) * (? * sd.nstdfactor)
                FROM stockdetail sd
                LEFT JOIN unit u ON u.cunipk = sd.cstdfkuni
                LEFT JOIN stock s ON s.cstkpk = ?
                WHERE sd.cstdcode = ?
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
          row.qty,
          row.pk,
          row.stock_id_header,
        ];
        const detailResponse = await this.genericRepository.query<any>(
          detailQuery,
          detailParams,
        );
      }
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.OK,
        Constants.TRANSACTION_SUCCESS,
      );
    } catch (error) {
      // for avoiding data corruption
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
      SET L_so = 1000
      WHERE L_so NOT REGEXP '^[0-9]+$';`);

    const updateQuery = `UPDATE ymk SET L_so = L_so + 1;`;
    await this.genericRepository.query<any>(updateQuery);

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
        ?, ?, STR_TO_DATE(?, '%d-%m-%Y'), CURDATE(), 
        STR_TO_DATE(?, '%d-%m-%Y'), ?, ?, ?, 
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
      body.invoice.salesman.pk || '..default..............',
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
                    (SELECT cinvpk FROM porder WHERE cinvrefno = ? and cinvspecial = 'SO'), 
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

      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.OK,
        Constants.TRANSACTION_SUCCESS,
      );
    } catch (error) {
      const deleteInvoiceDetail = `Delete FROM porderdetail WHERE civdfkinv = (SELECT cinvpk FROM invoice WHERE cinvrefno = ? and cinvspecial = 'JL')`;
      await this.genericRepository.query<any>(
        deleteInvoiceDetail,
        [body.invoice.invoiceNo],
      );
      const deleteInvoice = `Delete FROM porderdetail WHERE cinvrefno = ?`;
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

  async posInvoice(user: string) {
    await this.genericRepository.query(`
      UPDATE ymk
      SET L_pos = 1000
      WHERE L_pos NOT REGEXP '^[0-9]+$';`);

      await this.genericRepository.query<any>(
        `Update ymk Set L_pos = L_pos + 1;`,
      );

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
        HOUR(NOW()), ?, ?,
        'PS', 'n/a',  '..rupiah...............', 1, 1, 1,
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        0, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0
    )
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
    try {
      const invoiceResponse = await this.genericRepository.query<any>(
        invoiceQuery,
        invoiceParams,
      );
      // Handle invoice response
      const invoicePK = body.invoiceNo;

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
        `;
      const qtyResponse = await this.genericRepository.query<any>(qtyQuery, [
        row.stock_id_header,
      ]);
      const qty = parseInt(qtyResponse[0].Qty) || 0;
        const detailQuery = `
                INSERT INTO invoicedetail (
    civdfkstk, civdcode, nivdonhand, nivdqtyout, qtyresep, civdpk, civdfkinv, nivdprice,
    nivdfactor, nivdzqtyout, nivdamount, nivdorder, civdunit, nivdstkppn,
    civdmemo, nivdpokok, civdpromocard, civdresep
) 
SELECT ?, ?, ?, ?, ?, LEFT(SHA1(UUID()), 23), 
    (SELECT cinvpk FROM invoice WHERE cinvrefno = ? and cinvspecial = 'PS'), -- Subquery for civdfkinv
    ?, sd.nstdfactor, ? * sd.nstdfactor,
    ? * ?, ?, u.cunidesc, s.nstkppn, 0, (select nstkbuy from stock where cstkpk= ?) * (? * sd.nstdfactor), ' ', ' '
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
              body.invoice.invoiceNo, // cinvrefno (subquery in SELECT)
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
      
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.OK,
        Constants.TRANSACTION_SUCCESS,
      );
    } catch (error) {
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
      SET L_opname = 1000
      WHERE L_opname NOT REGEXP '^[0-9]+$';`);

      await this.genericRepository.query<any>(
        `Update ymk Set L_opname = L_opname + 1;`,
      );

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
  
  async setStockInvoice(body: any) {
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
      STR_TO_DATE(?, '%d-%m-%Y'), STR_TO_DATE(?, '%d-%m-%Y'), STR_TO_DATE(?, '%d-%m-%Y'), STR_TO_DATE(?, '%d-%m-%Y'),
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
    try {
      const invoiceResponse = await this.genericRepository.query<any>(
        invoiceQuery,
        invoiceParams,
      );

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
        `;
      const qtyResponse = await this.genericRepository.query<any>(qtyQuery, [
        row.stock_id_header,
      ]);
      const qty = parseInt(qtyResponse[0].Qty) || 0;
        const nivdqtyin = qty < row.qty ? row.qty - qty : 0;
        const nivdzqtyin = qty < row.qty ? row.qty - qty : 0;
        const nivdqtyout = qty >= row.qty ? qty - row.qty : 0;
        const nivdzqtyout = qty >= row.qty ? qty - row.qty : 0;
        const nivdamount = row.qty - qty; 
        const detailQuery = `
            INSERT INTO invoicedetail (
              civdfkstk, civdcode, nivdonhand, nivdadjust, 
              civdpk, civdfkinv, nivdprice, 
              nivdqtyin, nivdzqtyin, nivdqtyout, nivdzqtyout,
              nivdamount, nivdorder, civdunit
            ) Values (
              ?, ?, ?, ?, 
              LEFT(SHA1(UUID()), 23), (SELECT cinvpk FROM invoice WHERE cinvrefno = ? and cinvspecial = 'OP'),
              (SELECT nstkbuy FROM stock WHERE cstkpk = ?),
              ?, ?, ?, ?,
              (? * (SELECT nstkbuy FROM stock WHERE cstkpk = ?)), ?,
              (SELECT cunidesc FROM unit WHERE cunipk = (SELECT cstdfkuni FROM stockdetail WHERE nstdfactor=1 AND cstdfkstk = ?))
            )
        `;
        
        const detailParams = [
          row.pk, row.stock_id_header, qty, 
          row.qty, body.invoice.invoiceNo, row.pk, 
          nivdqtyin, nivdzqtyin, nivdqtyout, nivdzqtyout,  // Pre-calculated values
          nivdamount, row.pk, i + 1,  // nivdamount and sequence number
          row.pk  // Stock PK for retrieving unit information
        ];
        

        const detailResponse = await this.genericRepository.query<any>(
          detailQuery,
          detailParams,
        );
      }
      
      return ResponseHelper.CreateResponse<any>(
        null,
        HttpStatus.OK,
        Constants.TRANSACTION_SUCCESS,
      );
    } catch (error) {
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
