import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import ApiResponse from '../helper/api-response';
import { LocalizationService } from 'src/services/localization.service';


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
    const locale = request.headers['accept-language'] || 'en';
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        if (!data) {
          response.status(HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
          data.message = this.localizationService.translate(locale, 'backend', data.message);
          response.status(data.statusCode);
        }
        return data;
      }),
    );
  }
}
