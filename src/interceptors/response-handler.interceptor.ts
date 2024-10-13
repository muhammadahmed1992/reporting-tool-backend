import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import ApiResponse from '../helper/api-response';
import { LocalizationService } from 'src/services/localization.service';
import { Request } from 'express';

@Injectable()
export default class ResponseHandlerInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly localizationService: LocalizationService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const locale = request.headers['accept-language'] || 'id';

    // Extract body and parameters
    const body = request.body;
    const params = request.params;

    // Log the endpoint, body, and parameters
    console.log('Endpoint:', request.url);
    console.log('Request Body:', body);
    console.log('Request Parameters:', params);


    return next.handle().pipe(
      switchMap((data) => {
        console.log(data);
        const response = context.switchToHttp().getResponse();
        if (data) {
          return from(this.localizationService.translate(locale, 'backend', data.message))
            .pipe(
              map((translatedMessage) => {
                data.message = translatedMessage;
                response.status(data.statusCode);
                return data;
              })
            );
        } else {
          response.status(HttpStatus.INTERNAL_SERVER_ERROR);
          return from([data]);
        }
      }),
    );
  }
}
