import { Injectable } from '@nestjs/common';
import { PaymentMethod } from 'src/common/types/bot-enum';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}
  async toggleStatusOfAccount(status: boolean, paymentMethod: PaymentMethod) {
    return await this.prisma.clientReceivingAccount.updateMany({
      where: { paymentMethod: paymentMethod as any },
      data: { isActive: status },
    });
  }
  async configMaxTrial(maxTrial: number) {
    return await this.prisma.adminConfig.update({
      where: { key: 'max_try' },
      data: { value: String(maxTrial) },
    });
  }
  async configTimeStamp(diffHours: string) {
    return await this.prisma.adminConfig.update({
      where: { key: 'diffHours' },
      data: { value: diffHours },
    });
  }
  async getMaxWIndowHr(): Promise<number> {
    const val = await this.prisma.adminConfig.findFirst({
      where: { key: 'max_window' },
    });
    return Number(val?.value) ?? 2;
  }
}
