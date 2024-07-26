import { Injectable, HttpStatus } from '@nestjs/common';

import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository'

import { CashDrawerDTO } from '../dto/cashdrawer.dto';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';

@Injectable()
export class CashDrawerReport implements ReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(...params: any): Promise<ApiResponse<any>> {
        let query = `
SELECT
    Date,
    FORMAT(Opening,0) Opening,
    FORMAT(@running_opening := @running_opening + Opening,0) AS RunningOpening,
    FORMAT(DP,0) AS DP,
    FORMAT(@running_dp := @running_dp + DP,0) AS RunningDP,
    FORMAT(Voucher,0) AS Voucher,
    FORMAT(@running_voucher := @running_voucher + Voucher,0) AS RunningVoucher,
    FORMAT(Cash,0) AS Cash,
    FORMAT(@running_cash := @running_cash + Cash,0) AS RunningCash,
    FORMAT(Payroll,0) AS Payroll,
    FORMAT(@running_payroll := @running_payroll + Payroll,0) AS RunningPayroll,
    FORMAT(CreditCard,0) AS CreditCard,
    FORMAT(@running_creditcard := @running_creditcard + CreditCard,0) AS RunningCreditCard,
    FORMAT(DebitCard,0) AS DebitCard,
    FORMAT(@running_debitcard := @running_debitcard + DebitCard,0) AS RunningDebitCard,
    FORMAT(Online,0) AS Online,
    FORMAT(@running_online := @running_online + Online,0) AS RunningOnline,
    FORMAT(Withdrawn,0) AS Withdrawn,
    FORMAT(@running_withdrawn := @running_withdrawn + Withdrawn,0) AS RunningWithdrawn,
    FORMAT(Cancel,0) AS Cancel,
    FORMAT(@running_cancel := @running_cancel + Cancel,0) AS RunningCancel,
    FORMAT(Balance,0) AS Balance,
    FORMAT(@running_balance := @running_balance + Balance,0) AS RunningBalance
FROM (        
        SELECT 
        DATE_FORMAT(a.dinvdate,'%d-%m-%y') AS Date,
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
            COUNT(*) AS tstruk, 
            SUM(ninvccard_nilai - ninvcredit) AS extrac
         FROM 
            invoice
         WHERE 
            cINVspecial = 'PS'
            AND dinvdate >= ? 
            AND dinvdate <= ?
         GROUP BY 
            dINVdate
        ) AS a
    LEFT JOIN
        (SELECT 
            dINVdate, 
            SUM(nINVdp + nINVvoucher + nINVtunai + nINVpiutang + nINVccard_nilai + nINVdebit + ninvmobile) AS batal,
            SUM(ninvccard_nilai - ninvcredit) AS bextrac,
            COUNT(*) AS btstruk
         FROM 
            invoice 
         WHERE 
            cINVspecial = 'RS'
         GROUP BY 
            dINVdate
        ) AS b
    ON 
        b.dinvdate = a.dinvdate
    LEFT JOIN
        (SELECT 
            ddradate, 
            SUM(ndraopen) AS nopen, 
            SUM(ndradraw + ndradraw1) AS ndraw
         FROM 
            drawer
         GROUP BY 
            ddradate
        ) AS c
    ON 
        c.ddradate = a.dinvdate
    ORDER BY 
        Date)  AS subquery,
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
) AS vars;
`;
        let [startDate, endDate] = params;
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
        const parameters = [];
        parameters.push(startDate);
        parameters.push(endDate);
        console.log(`query: ${query}`);
        console.log(`Report Name: ${ReportName.CashDrawer}`);
        console.log(`startDate: ${startDate}`);
        console.log(`endDate: ${endDate}`);
        console.log('=============================');
        const response = await this.genericRepository.query<CashDrawerDTO>(query, parameters);
        if (response?.length) {
            return ResponseHelper.CreateResponse<CashDrawerDTO[]>(response, HttpStatus.OK, 'Data retrieved successfully.');
        } else {
            return ResponseHelper.CreateResponse<CashDrawerDTO[]>([], HttpStatus.NOT_FOUND, 'Data not found on these parameters.');
        }
    }
}