import { Controller, Post, Body } from '@nestjs/common';
import { Andriod2Service } from '../service/andriod2.service'

@Controller('andriod2')
export class Andriod2Controller {
  constructor(private readonly andriod2Service: Andriod2Service) {}

  @Post('/auth/validate')
  async validateUser(@Body() body: { username: string; password: string }): Promise<{ valid: boolean }> {
    const isValid = await this.andriod2Service.validateUser(body.username, body.password);
    return { valid: isValid };
  }
}
