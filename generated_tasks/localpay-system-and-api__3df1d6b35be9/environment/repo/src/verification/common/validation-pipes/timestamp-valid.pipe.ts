import { CrawlResult } from '@prisma/client';
import { PipeResult } from './duplicate-transaction.pipe';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class TimestampValidPipe {
  constructor(private readonly prisma: PrismaService) {}

  async run(crawl: CrawlResult): Promise<PipeResult> {
    const MAX_AGE_HOURS = await this.getMaxWIndowHr();
    if (!crawl.confirmedTimestamp) {
      return {
        pass: false,
        reasonCode: 'TIMESTAMP_UNREADABLE',
        detail: 'Could not read transaction timestamp from bank response.',
      };
    }

    const now = new Date();
    const diffMs = now.getTime() - crawl.confirmedTimestamp.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 0) {
      return {
        pass: false,
        reasonCode: 'TIMESTAMP_FUTURE',
        detail: `Transaction timestamp is ${Math.abs(Math.floor(diffHours))}h in the future.`,
      };
    }

    if (diffHours > MAX_AGE_HOURS) {
      return {
        pass: false,
        reasonCode: 'TIMESTAMP_EXPIRED',
        detail: `Transaction is ${Math.floor(diffHours)}h old. Maximum allowed is ${MAX_AGE_HOURS}h.`,
      };
    }

    return { pass: true };
  }
  private async getMaxWIndowHr(): Promise<number> {
    const val = await this.prisma.adminConfig.findFirst({
      where: { key: 'max_window' },
    });
    return val?.value ? Number(val.value) : 2;
  }
}
