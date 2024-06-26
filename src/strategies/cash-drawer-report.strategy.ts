import { Injectable } from '@nestjs/common';
import { DateRangeReportStrategy } from 'src/interfaces/report-date-range-parameter.strategy';
import { GenericRepository } from '../repository/generic.repository'

@Injectable()
export class CashDrawerReportStrategy implements DateRangeReportStrategy {
    constructor(private readonly genericRepository: GenericRepository) {}

    public async generateReport(startDate: Date, endDate: Date): Promise<any> {
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
        Date;
    
        `;
        const result = await this.genericRepository.query(query, [startDate, endDate]);
        return result;
    }
}