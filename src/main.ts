import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import ResponseHandlerInterceptor from './interceptors/response-handler.interceptor';
import { LocalizationService } from './services/localization.service'; // Import the service
import { ValidationPipe } from '@nestjs/common';
import { GenericExceptionsFilter } from './filters/exception.filter';

declare const module: any;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ResponseHandlerInterceptor(app.get(LocalizationService)));
  app.useGlobalFilters(new GenericExceptionsFilter())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,    // Strip out properties that don't have decorators
      transform: true,    // Automatically transform queryString into their expected types
      transformOptions: {
        enableImplicitConversion: true, // Allow automatic type conversion
      },
    }),
  );
  await app.listen(process.env.PORT || 3002);
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