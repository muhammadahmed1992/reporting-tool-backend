import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import { ReportFactory } from './../factory/report-factory';
import ApiResponse from 'src/helper/api-response';
import { GenericRepository } from 'src/repository/generic.repository';
import { TransactionSalesDto } from '../dto/transaction-sales.dto';
import ResponseHelper from 'src/helper/response-helper';
import Constants from 'src/helper/constants';
import { TransactionSalesTableDto } from 'src/dto/transaction-sales-table.dto';
import { TransactionSalesInvoiceDTO } from 'src/dto/transaction-sales-invoice.dto';

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
    const warehouse = {primaryKey: '', description: ''};
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
    
    const response = await this.genericRepository.query<TransactionSalesTableDto>(query, [stockId]);
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
        ninvtax, cinvuser, oleh, ninvexpire, 
        cinvspecial, cinvtransfer, cinvfkexc, kunci, ninvrate, 
        ninvoption, ninvratep, cinvserie, cinvtaxinv, cinvpo, 
        ninvno_card, ninvjenis_card, ninvccard_nama, ninvccard_oto, 
        cinvdine, cinvmeja, cinvsedan, cinvsedancode, cinvepajak, 
        cinvremark, cinvremark1, ninvkembali, ninvpoint, ninvpax, 
        npostransfer, ninvpromov, ninvpromod, ninvpromos, ninvkm, 
        ninvpawal, ninvcetak1, ninvpilih, ninvpersen, xkirim, ninvvalue
    ) VALUES (
        ?, ?, STR_TO_DATE(?, '%Y-%m-%d'), CURDATE(), 
        STR_TO_DATE(?, '%Y-%m-%d'), ?, ?, NULL, 
        ?, LEFT(SHA1(UUID()), 23), ?, ?, 
        CONCAT(DATE_FORMAT(NOW(), '%d-%m-%Y %H:%i'), ' ', ?), 
        (SELECT soexpire FROM ymk2), -- ninvexpire
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
    body.invoiceNo, body.warehouse, body.date, body.date,
    body.customer.pk, body.customer.desc, body.salesman.pk, 
    body.tax, body.loginUser, body.loginUser, 
    body.invoiceNo - 10000
];


    try {
        const invoiceResponse = await this.genericRepository.query<any>(invoiceQuery, invoiceParams);
        const invoicePK = body.invoiceNo;

        for (let i = 0; i < body.tableFormData.length; i++) {
            const row = body.tableFormData[i];

            const detailQuery = `
                INSERT INTO invoicedetail (
                    civdfkstk, civdcode, nivdqtyout, civdpk, civdfkinv, nivdprice,
                    nivdfactor, nivdzqtyout, nivdamount, nivdorder, civdunit, nivdstkppn,
                    civdsn
                ) 
                SELECT ?, ?, ?, LEFT(SHA1(UUID()), 23),
                    (SELECT cinvpk FROM invoice WHERE cinvrefno = ?), 
                    ?, sd.nstdfactor, ? * sd.nstdfactor,
                    ? * ?, ?, u.cunidesc, s.nstkppn, ' '
                FROM stockdetail sd
                LEFT JOIN unit u ON u.cunipk = sd.cstdfkuni
                LEFT JOIN stock s ON s.cstkpk = ?
                WHERE sd.cstdcode = ?
                LIMIT 1;
            `;

            const detailParams = [
                row.pk, row.stock_id_header, row.qty, body.invoiceNo, row.price, 
                row.qty, row.qty, row.price, (i + 1), row.pk, row.stock_id_header
            ];

            const detailResponse = await this.genericRepository.query<any>(detailQuery, detailParams);
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


}
