import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BigIntInterceptor } from './common/interceptors/bigint.interceptor';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { UserSyncInterceptor } from './common/interceptors/sync-user.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Suppress noisy logs in production, keep errors
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['error', 'warn', 'log', 'debug'],
  });

  // ─── Security Headers ───────────────────────────────────────────
  app.use(helmet());

  // ─── Compression ────────────────────────────────────────────────

  // ─── CORS ───────────────────────────────────────────────────────
  app.enableCors({
    origin: ['*', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ─── Global Prefix ──────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── Validation ─────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: true, // throw on unknown fields
      transform: true, // auto-transform payloads to DTO types
    }),
  );

  // ─── Global Interceptors ────────────────────────────────────────
  app.useGlobalInterceptors(
    app.get(BigIntInterceptor),
    app.get(UserSyncInterceptor),
    app.get(LoggingInterceptor),
  );

  // ─── Graceful Shutdown ──────────────────────────────────────────
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}
bootstrap();
