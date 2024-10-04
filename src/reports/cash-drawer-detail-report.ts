import { Injectable, HttpStatus } from '@nestjs/common';

import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository'

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { CashDrawerDetailDTO } from 'src/dto/cashdrawer-detail.dto';
import { LocalizationService } from 'src/services/localization.service';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class CashDrawerDetailReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository,
                private readonly localizationService: LocalizationService
    ) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        const {startDate, endDate, sortColumn, sortDirection} = queryString;
        let sortBy;
        const sortOrder = !sortDirection ? 'ASC' : sortDirection;
        if(!sortColumn || sortColumn === 'date_header' || sortColumn === 'cashier_header') {
            sortBy = !sortColumn ? 'date_header, cashier_header' : sortColumn;
        } else {
            sortBy = `CAST(REPLACE(${sortColumn}, ',', '') AS SIGNED)`  
        }
        let query = `
SELECT
    Cashier as cashier_header,
    Date as date_header,
    FORMAT(Opening,0) as opening_header,
    FORMAT(@running_opening := @running_opening + Opening,0) AS running_opening_header,
    FORMAT(DP,0) AS dp_header,
    FORMAT(@running_dp := @running_dp + DP,0) AS running_dp_header,
    FORMAT(Voucher,0) AS voucher_header,
    FORMAT(@running_voucher := @running_voucher + Voucher,0) AS running_voucher_header,
    FORMAT(Cash,0) AS cash_header,
    FORMAT(@running_cash := @running_cash + Cash,0) AS running_cash_header,
    FORMAT(Payroll,0) AS payroll_header,
    FORMAT(@running_payroll := @running_payroll + Payroll,0) AS running_payroll_header,
    FORMAT(CreditCard,0) AS credit_card_header,
    FORMAT(@running_creditcard := @running_creditcard + CreditCard,0) AS running_credit_card_header,
    FORMAT(DebitCard,0) AS debit_card_header,
    FORMAT(@running_debitcard := @running_debitcard + DebitCard,0) AS running_debit_card_header,
    FORMAT(Online,0) AS online_header,
    FORMAT(@running_online := @running_online + Online,0) AS running_online_header,
    FORMAT(Withdrawn,0) AS withdrawn_header,
    FORMAT(@running_withdrawn := @running_withdrawn + Withdrawn,0) AS running_withdrawn_header,
    FORMAT(Cancel,0) AS cancel_header,
    FORMAT(@running_cancel := @running_cancel + Cancel,0) AS running_cancel_header,
    FORMAT(Balance,0) AS balance_header,
    FORMAT(@running_balance := @running_balance + Balance,0) AS running_balance_header
FROM (        
        SELECT 
        LTRIM(RTRIM(a.cinvuser)) as Cashier,
        DATE_FORMAT(a.dinvdate,'%d-%m-%Y') AS Date,
        IF(nopen IS NULL, 0, nopen) AS Opening,
        mdp AS DP,
        mvoucher AS Voucher,
        mtunai AS Cash,
        mpiutang AS Payroll,
        mcard AS CreditCard,
        mdebit AS DebitCard,
        mmobile AS Online,
        IF(ndraw IS NULL, 0, ndraw) AS Withdrawn,
        IF(batal IS NULL, 0, batal) AS Cancel,
        a.mdp + a.mvoucher + a.mtunai + a.mpiutang + a.mcard + a.mdebit + a.mmobile 
        - IF(batal IS NULL, 0, batal) + IF(nopen IS NULL, 0, nopen) - IF(ndraw IS NULL, 0, ndraw) AS Balance
    FROM
        (SELECT 
            cinvuser,
            dINVdate, 
            SUM(nINVdp) AS mdp, 
            SUM(nINVvoucher) AS mvoucher,  
            SUM(nINVtunai) AS mtunai,  
            SUM(nINVpiutang) AS mpiutang,
            SUM(nINVCredit) AS mcredit, 
            SUM(nINVdebit) AS mdebit,
            SUM(ninvmobile) AS mmobile,
            SUM(nINVccard_nilai) AS mcard,
            SUM((ninvvalue - ninvfreight) / (1 + ninvtax / 100)) AS mnetto, 
            COUNT(1) AS tstruk, 
            SUM(ninvccard_nilai - ninvcredit) AS extrac
         FROM 
            invoice
         WHERE 
            cINVspecial = 'PS'
            AND dinvdate >= ? 
            AND dinvdate <= ?
         GROUP BY
            dINVdate,
            cinvuser
        ) AS a
    LEFT JOIN
        (SELECT 
            cinvuser,
            dINVdate, 
            SUM(nINVdp + nINVvoucher + nINVtunai + nINVpiutang + nINVccard_nilai + nINVdebit + ninvmobile) AS batal,
            SUM(ninvccard_nilai - ninvcredit) AS bextrac,
            COUNT(1) AS btstruk
         FROM 
            invoice 
         WHERE 
            cINVspecial = 'RS'
         GROUP BY 
            dINVdate, cinvuser
        ) AS b
    ON 
        b.dinvdate = a.dinvdate and b.cinvuser=a.cinvuser
    LEFT JOIN
        (SELECT 
            ddradate, cdrauser,
            SUM(ndraopen) AS nopen, 
            SUM(ndradraw + ndradraw1) AS ndraw
            
         FROM 
            drawer
         GROUP BY 
            cdrauser,ddradate
        ) AS c
    ON 
        c.ddradate = a.dinvdate and c.cdrauser=a.cinvuser)  AS subquery,
(SELECT 
    @running_opening := 0,
    @running_dp := 0,
    @running_voucher := 0,
    @running_cash := 0,
    @running_payroll := 0,
    @running_creditcard := 0,
    @running_debitcard := 0,
    @running_online := 0,
    @running_withdrawn := 0,
    @running_cancel := 0,
    @running_balance := 0
) AS vars  
 ORDER BY ${sortBy} ${sortOrder};
`;
        const parameters = [];
        parameters.push(startDate);
        parameters.push(endDate);
        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.Cash_Drawer_Detail}`);
        console.log(`startDate: ${startDate}`);
        console.log(`endDate: ${endDate}`);
        console.log('=============================');
        const response = await this.genericRepository.query<CashDrawerDetailDTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<CashDrawerDetailDTO[]>(response, HttpStatus.OK, Constants.DATA_SUCCESS);
        } else {
            return ResponseHelper.CreateResponse<CashDrawerDetailDTO[]>([], HttpStatus.NOT_FOUND, Constants.DATA_NOT_FOUND);
        }
    }
}