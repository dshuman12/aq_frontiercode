import { Module } from '@nestjs/common';
import { DepositController } from './deposit/deposit.controller';
import { HistoryController } from './history/history.controller';
import { DepositWebService } from './deposit/deposit.web.service';
import { WebAuthGuard } from './auth/web-auth.guard';
import { VerificationModule } from 'src/verification/verification.module';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { SmsPreValidatorService } from 'src/common/pipes/sms.pipe';
import { AuthModule } from 'src/auth/auth.module';
import { GatewayModule } from 'src/gateway/gateway.module';

@Module({
  imports: [
    VerificationModule, // exports VerificationService
    PrismaModule,
    AuthModule, // exports PrismaService
    GatewayModule,
  ],
  controllers: [DepositController, HistoryController],
  providers: [DepositWebService, WebAuthGuard, SmsPreValidatorService],
})
export class WebApiModule {}
