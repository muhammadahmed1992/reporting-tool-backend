import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';
  
  @Injectable()
  export class DateInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const request = context.switchToHttp().getRequest();
  
      // Access query parameters
      const { startDate, endDate } = request.query;
  
      // Set default values if startDate or endDate is missing
      request.query.startDate = this.formatDate(startDate);
      request.query.endDate = this.formatDate(endDate);
  
      return next.handle().pipe(
        map((data) => {
          return data; // Pass the modified data through
        }),
      );
    }
  
    // Helper function to format date as 'YYYY-MM-DD' or set today's date
    private formatDate(value: string): string {
      if (!value || value === '') {
        // If no value, use today's date
        const today = new Date().toISOString().split('T')[0];
        return today;
      }
  
      // Format existing date to 'YYYY-MM-DD' (remove time part)
      return new Date(value).toISOString().split('T')[0];
    }
  }
  