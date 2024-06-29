import { Controller, Post, Body } from '@nestjs/common';
import { Andriod2Service } from '../service/andriod2.service'
import ApiResponse from 'src/helper/api-response';

@Controller('andriod2')
export class Andriod2Controller {
  constructor(private readonly andriod2Service: Andriod2Service) {}

  @Post('/auth/validate')
  async validateUser(@Body() body: { username: string; password: string }): Promise<ApiResponse<boolean>> {
    const result = await this.andriod2Service.validateUser(body.username, body.password);
    return result;
  }
}
