import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import ResponseHandlerInterceptor from './interceptors/response-handler.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ResponseHandlerInterceptor());
  console.log('port is: ' + process.env.PORT);
  await app.listen(process.env.PORT || 3000);
}
try {
  bootstrap();
} catch (e) {
  console.log('error');
  console.log(e);
}
