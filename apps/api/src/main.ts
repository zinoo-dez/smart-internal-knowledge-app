import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Force load root .env with override: true so valid API keys always take precedence over stale shell env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

import { AppModule } from './app.module';
import { createCorsOriginValidator } from './common/config/cors.config';
import { GlobalExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('NestApplication');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // 1. Production HTTP Security Headers
  app.use(helmet());

  // 2. Strict CORS Configuration (never combine wildcard '*' with credentials in production)
  app.enableCors({
    origin: createCorsOriginValidator(process.env.ALLOWED_ORIGINS, process.env.NODE_ENV),
    credentials: true,
  });

  // 3. Centralized Exception Filter
  app.useGlobalFilters(new GlobalExceptionsFilter());

  // 4. Strict DTO Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`API Gateway listening on 0.0.0.0:${port}`);
}

bootstrap();
