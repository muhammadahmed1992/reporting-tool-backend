import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import ResponseHelper from 'src/helper/response-helper';

@Injectable()
export class ConnectionStringMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const connectionString = req.headers['connection-string'] as string;
    if (!connectionString) {
        return res.status(HttpStatus.BAD_REQUEST).json(ResponseHelper.CreateResponse(null, HttpStatus.BAD_REQUEST, 'Please specify connection string'));
    }
    req['connectionString'] = connectionString;
    next();
  }
}
