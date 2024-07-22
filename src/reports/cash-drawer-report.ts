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
        a.dinvdate AS Date,
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
        Date;`;
        let [startDate, endDate] = params;
        if (!startDate)
            startDate = new Date();
        if (!endDate)
            endDate = new Date();
        const parameters = [];
        parameters.push(startDate);
        parameters.push(endDate);
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