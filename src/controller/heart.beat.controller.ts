import { Controller, Get, HttpStatus } from '@nestjs/common';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';

@Controller('heart-beat')
export class HeartBeatController {
  constructor() {}

  @Get('/check')
  async CheckHeartBeat(): Promise<ApiResponse<boolean>> {
    return ResponseHelper.CreateResponse<boolean>(true, HttpStatus.OK);
  }
}
