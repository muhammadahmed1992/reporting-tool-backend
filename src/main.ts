import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import ResponseHandlerInterceptor from './interceptors/response-handler.interceptor';
import { LocalizationService } from './services/localization.service'; // Import the service

declare const module: any;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ResponseHandlerInterceptor(app.get(LocalizationService)));
  await app.listen(process.env.PORT || 3000);
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
try {
  bootstrap();
} catch (e) {
  console.log('error');
  console.log(e);
}
