import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import { GenericRepository } from '../../repository/generic.repository'
import * as crypto from 'crypto';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { UserDTO } from 'src/dto/user.dto';
import Constants from 'src/helper/constants';

@Injectable({ scope: Scope.REQUEST })
export class Andriod2Service {
  constructor(private readonly genericRepository: GenericRepository) {}

  async validateUser(username: string, password: string): Promise<ApiResponse<any>> {
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
    const query = 'SELECT nandsuspend as IsNotLoginAllowed, nandlaporan as IsSwitchDatabase, nandbeli as IsPurchaseReportAllowed, nandstock as IsStockReportAllowed, nandjual as IsSalesReportAndCashReportAllowed FROM `android2` WHERE canddesc = ? AND candpw = ?';
    const result = await this.genericRepository.query(query, [username, hashedPassword]);

    if (result.length === 0) {
      return ResponseHelper.CreateResponse(null, HttpStatus.NOT_FOUND, Constants.INVALID_USER);
    } else {
      if ((result[0] as any).IsNotLoginAllowed) return ResponseHelper.CreateResponse(null, HttpStatus.UNAUTHORIZED, Constants.UN_AUTHORIZED_USER);
      const res: UserDTO = {
        IsValid: true,
        IsSwitchDatabase: !(!((result[0] as any).IsSwitchDatabase)),
        IsPurchaseReportAllowed: !(!((result[0] as any).IsPurchaseReportAllowed)),
        IsStockReportAllowed: !(!((result[0] as any).IsStockReportAllowed)),
        IsSalesReportAndCashReportAllowed: !(!((result[0] as any).IsSalesReportAndCashReportAllowed))
      };
      return ResponseHelper.CreateResponse(res, HttpStatus.OK);
    }
  }
}
