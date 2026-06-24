import { Injectable, Logger } from '@nestjs/common';
import { CheckoutStatus } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class GatewayCheckoutCronService {
  private readonly logger = new Logger(GatewayCheckoutCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 */30 * * * *')
  async expirePendingCheckouts() {
    const result = await this.prisma.gatewayCheckout.updateMany({
      where: {
        status: CheckoutStatus.PENDING,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        status: CheckoutStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} pending checkout(s).`);
    }
  }
}
