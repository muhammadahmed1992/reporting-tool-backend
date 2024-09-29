import { Injectable, HttpStatus } from '@nestjs/common';

import { ReportStrategy } from '../interfaces-strategy/report-strategy';
import { GenericRepository } from '../repository/generic.repository';

import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { ReportName } from 'src/helper/enums/report-names.enum';
import Constants from 'src/helper/constants';
import { CashDrawerDetailDTO } from 'src/dto/cashdrawer-detail.dto';
import { LocalizationService } from 'src/services/localization.service';
import { QueryStringDTO } from 'src/dto/query-string.dto';

@Injectable()
export class CashDrawerDetailReport implements ReportStrategy {
  constructor(
    private readonly genericRepository: GenericRepository,
    private readonly localizationService: LocalizationService,
  ) {}

    public async generateReport(queryString: QueryStringDTO): Promise<ApiResponse<any>> {
        let query = `
SELECT
    COUNT(1) as total_rows
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
        c.ddradate = a.dinvdate and c.cdrauser=a.cinvuser
    ORDER BY 
        Date, Cashier)  AS subquery,
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
        const {startDate, endDate} = queryString;
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
}
