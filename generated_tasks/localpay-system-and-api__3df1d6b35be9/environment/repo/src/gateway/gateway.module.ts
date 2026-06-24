import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { CheckoutTokenService } from './checkout-url-builder';
import { TransactionsModule } from 'src/transactions/transactions.module';
import { GatewayCheckoutCronService } from './gateway-checkout-cron.service';

@Module({
  imports: [PrismaModule, TransactionsModule],
  controllers: [GatewayController],
  providers: [GatewayService, CheckoutTokenService, GatewayCheckoutCronService],
  exports: [GatewayService],
})
export class GatewayModule {}
