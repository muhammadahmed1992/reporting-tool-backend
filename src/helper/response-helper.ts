import ApiResponse from './api-response';
export default class ResponseHelper<T> {
  public static CreateResponse<T>(
    data?: T,
    statusCode?: number,
    message?: string
  ) {
    return new ApiResponse<T>(message, data, statusCode);
  }
}
