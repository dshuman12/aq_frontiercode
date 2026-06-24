import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { VerificationModule } from './verification/verification.module';

import { TransactionsModule } from './transactions/transactions.module';
import { WebApiModule } from './web-api/web-api.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { InterceptorModule } from './common/interceptors/interceptor.module';
import { GatewayModule } from './gateway/gateway.module';
import { AdminModule } from './admin/admin.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from './common/cache/cache.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 minute window
        limit: 30, // 30 requests per window globally
      },
      {
        name: 'deposit',
        ttl: 60_000,
        limit: 7, // OCR is expensive — tighter limit
      },
    ]),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    CacheModule,
    PrismaModule,
    VerificationModule,
    TransactionsModule,
    WebApiModule, // ← REST API for the web application
    InterceptorModule,
    GatewayModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
