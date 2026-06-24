import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { UserSyncInterceptor } from './sync-user.interceptor';
import { BigIntInterceptor } from './bigint.interceptor';
import { LoggingInterceptor } from './logging.interceptor';
@Module({
  imports: [AuthModule],
  providers: [UserSyncInterceptor, BigIntInterceptor, LoggingInterceptor],
  exports: [UserSyncInterceptor, BigIntInterceptor, LoggingInterceptor],
})
export class InterceptorModule {}
