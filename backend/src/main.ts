import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      exceptionFactory: (errors) => {
        const messages = errors
          .map((e) => Object.values(e.constraints || {}).join(', '))
          .join(' | ');
        return new BadRequestException(messages || 'Validation failed.');
      },
    }),
  );


  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');

  const port = config.get<number>('PORT') || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Hotel Booking API running on http://localhost:${port}/api`);
}
bootstrap();
