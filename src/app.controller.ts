import { Controller } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @Post()
  // async sendMessage(
  //   @Body() body: { message: string },
  // ): Promise<{ message: string }> {
  //   return await this.appService.sendMessage(body);
  // }
}
