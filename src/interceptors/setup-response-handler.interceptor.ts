import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()

export class SetupResponseHandler implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const modifiedData = Array.isArray(data.data)
          ? data.data.map((element) => {
              const values = Object.values(element); 
                return { [String(values[0])]: values[1] };
            })
          : data.data; 
        return {
          success: true, 
          data: modifiedData, 
          statusCode: data.statusCode,
        };
      }),
    );
  }
}
