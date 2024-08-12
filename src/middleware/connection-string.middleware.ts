import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import Constants from 'src/helper/constants';
import ResponseHelper from 'src/helper/response-helper';
import { Common } from 'src/utils/common';

@Injectable()
export class ConnectionStringMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const connectionString = decodeURIComponent(req.headers['connection-string'] as string);
    if (!connectionString) {
        return res.status(HttpStatus.BAD_REQUEST).json(ResponseHelper.CreateResponse(null, HttpStatus.BAD_REQUEST, Constants.CONNECTION_STRING_NOT_FOUND));
    }

    if (!Common.IsValidateMySqlConnectionString(connectionString)) {
      return res.status(HttpStatus.BAD_REQUEST).json(ResponseHelper.CreateResponse(null, HttpStatus.BAD_REQUEST, Constants.CONNECTION_STRING_BAD_FORMAT));
    }

    req['connection-string'] = connectionString;
    next();
  }
}
