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
  async salesInvoice(queryParams: any) {
    const { loggedInUser } = queryParams;
    const query = `
                SELECT
                    (SELECT L_jual FROM ymk) AS InvoiceNo,
                    DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS 'Date',
                    JSON_OBJECT('primaryKey', w.cwhspk, 'description', TRIM(w.cwhsdesc)) AS Warehouse,
                    ('') AS Customer,
                    ('') AS Salesman,
                    (SELECT gst FROM ymk3) AS Tax
                FROM
                    android2 a
                JOIN
                    warehouse w ON w.cwhspk = a.candfkwhs
                WHERE
                    canddesc = '${loggedInUser}';
            `;

    const response = await this.genericRepository.query<any>(query);

    // Parse the Warehouse JSON string into an object
    if (response?.length) {
      const parsedResponse = response.map((item) => ({
        ...item,
        Warehouse: JSON.parse(item.Warehouse), // Parsing the Warehouse field
      }));

      return ResponseHelper.CreateResponse<any>(
        parsedResponse,
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
    const query = `select cstkpk as pk, cstdcode as stock_id_header, Trim(cstkdesc) as stock_name, nstdprice as price, 1 as qty from stockdetail
            d join stock s on s.cstkpk = d.cstdfkstk where cstdcode='${stockId}';
            `;
    const response =
      await this.genericRepository.query<TransactionSalesTableDto>(query);
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
            '${body.invoiceNo}', '${body.warehouse}', STR_TO_DATE('${body.date}', '%Y-%m-%d'), CURDATE(), 
            STR_TO_DATE('${body.date}', '%Y-%m-%d'), '${body.customer.pk}', '${body.customer.desc}', NULL, 
            '${body.salesman.pk}', LEFT(SHA1(UUID()), 23), ${body.tax}, '${body.loginUser}', 
            CONCAT(DATE_FORMAT(NOW(), '%d-%m-%Y %H:%i'), ' ', '${body.loginUser}'), 
            (SELECT soexpire FROM ymk2), -- ninvexpire
            'JL', -- cinvspecial (Dummy value)
            'n/a', -- cinvtransfer (Dummy value)
            '..rupiah...............', -- cinvfkexc (Dummy value for exchange rate)
            1, -- kunci (Dummy value)
            1, -- ninvrate (Dummy value)
            1, -- ninvoption (Dummy value)
            1, -- ninvratep (Dummy value)
            ' ', -- cinvserie (Empty string)
            ' ', -- cinvtaxinv (Empty string)
            ' ', -- cinvpo (Empty string)
            ' ', -- ninvno_card (Empty string)
            ' ', -- ninvjenis_card (Empty string)
            ' ', -- ninvccard_nama (Empty string)
            ' ', -- ninvccard_oto (Empty string)
            ' ', -- cinvdine (Empty string)
            ' ', -- cinvmeja (Empty string)
            ' ', -- cinvsedan (Empty string)
            ' ', -- cinvsedancode (Empty string)
            ' ', -- cinvepajak (Empty string)
            ' ', -- cinvremark (Empty string)
            ' ', -- cinvremark1 (Empty string)
            0, -- ninvkembali (Dummy value)
            0, -- ninvpoint (Dummy value)
            0, -- ninvpax (Dummy value)
            0, -- npostransfer (Dummy value)
            0, -- ninvpromov (Dummy value)
            0, -- ninvpromod (Dummy value)
            0, -- ninvpromos (Dummy value)
            0, -- ninvkm (Dummy value)
            0, -- ninvpawal (Dummy value)
            0, -- ninvcetak1 (Dummy value)
            0, -- ninvpilih (Dummy value)
            0, -- ninvpersen (Dummy value)
            0, -- xkirim (Dummy value)
            ${body.invoiceNo - 10000} -- ninvvalue (Total invoice value)
        );
    `;
    console.log(invoiceQuery);

    try {
        const invoiceResponse = await this.genericRepository.query<any>(invoiceQuery);
        const invoicePK = body.invoiceNo;

        for (let i = 0; i < body.tableFormData.length; i++) {
            const row = body.tableFormData[i];

            const detailQuery = `
                INSERT INTO invoicedetail (
                    civdfkstk, civdcode, nivdqtyout, civdpk, civdfkinv, nivdprice,
                    nivdfactor, nivdzqtyout, nivdamount, nivdorder, civdunit, nivdstkppn,
                    civdsn
                ) 
                SELECT
                    '${row.pk}', '${row.stock_id_header}', '${row.qty}', LEFT(SHA1(UUID()), 23),
                    '${invoicePK}', '${row.price}', 
                    sd.nstdfactor, '${row.qty}' * sd.nstdfactor,
                    '${row.qty}' * '${row.price}', '${i + 1}', 
                    u.cunidesc, s.nstkppn, ' '
                FROM
                    stockdetail sd
                LEFT JOIN unit u ON u.cunipk = sd.cstdfkuni
                LEFT JOIN stock s ON s.cstkpk = '${row.pk}'
                WHERE 
                    sd.cstdcode = '${row.stock_id_header}'
                LIMIT 1;
            `;
            const detailResponse = await this.genericRepository.query<any>(detailQuery);
        }
        const updateQuery = await this.genericRepository.query<any>(`UPDATE ymk
            SET L_jual = L_jual + 1;`);
            
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
