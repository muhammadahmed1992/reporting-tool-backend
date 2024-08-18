import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import Constants from 'src/helper/constants';
import ResponseHelper from 'src/helper/response-helper';
import { LocalizationService } from 'src/services/localization.service';
import { Common } from 'src/utils/common';

@Injectable()
export class ConnectionStringMiddleware implements NestMiddleware {

  constructor(private readonly localizationService: LocalizationService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const locale = req.headers['accept-language'] || 'en';

    const connectionString = decodeURIComponent(req.headers['connection-string'] as string);
    if (!connectionString) {
        return res.status(HttpStatus.BAD_REQUEST).json(ResponseHelper.CreateResponse(null, HttpStatus.BAD_REQUEST, this.localizationService.translate(locale,'backend', Constants.CONNECTION_STRING_NOT_FOUND)));
    }

    if (!Common.IsValidateMySqlConnectionString(connectionString)) {
      return res.status(HttpStatus.BAD_REQUEST).json(ResponseHelper.CreateResponse(null, HttpStatus.BAD_REQUEST, this.localizationService.translate(locale, 'backend', Constants.CONNECTION_STRING_BAD_FORMAT)));
    }

    req['connection-string'] = connectionString;
    next();
  }
}
