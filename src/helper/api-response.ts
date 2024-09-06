import { HttpStatus } from '@nestjs/common';

export default class ApiResponse<T> {
  constructor(
    message: string,
    response: T,
    statusCode: number,
    meta?: any
  ) {
    this.message = message;
    this.data = response;
    if (statusCode >= HttpStatus.BAD_REQUEST) {
      this.success = false;
    } else {
      this.success = true;
    }
    this.statusCode = statusCode;
    this.meta = meta;
  }

  public statusCode: number = HttpStatus.OK;
  public data: T;
  public message: string = '';
  public success: boolean;
  public meta: any;
}
