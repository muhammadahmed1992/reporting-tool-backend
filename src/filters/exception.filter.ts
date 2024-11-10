import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { Response } from 'express';
import ResponseHelper from '../helper/response-helper';
  
  @Catch()
  export class GenericExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
  
      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
  
      const message =
        exception instanceof HttpException
          ? (exception.getResponse() as any).message || 'Error occurred'
          : 'Internal server error';
      console.error(exception);
      // Log the error (optional)
      console.error(`Error: ${JSON.stringify(message)}`);
  
      // Create the ApiResponse object
      const apiResponse = ResponseHelper.CreateResponse<any>(null, status, message);
  
      // Send the response in the desired format
      response.status(status).json(apiResponse);
    }
  }
  