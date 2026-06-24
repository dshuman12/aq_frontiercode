import { PrismaService } from 'src/common/prisma/prisma.service';
import { CrawlResult } from '@prisma/client';
import { Injectable } from '@nestjs/common';

export interface PipeResult {
  pass: boolean;
  reasonCode?: string;
  detail?: string;
}
@Injectable()
export class DuplicateTransactionPipe {
  constructor(private readonly prisma: PrismaService) {}

  async run(
    crawl: CrawlResult,
    currentDepositRequestId: string,
  ): Promise<PipeResult> {
    const existing = await this.prisma.crawlResult.findMany({
      where: {
        transactionId: crawl.transactionId,
        depositRequestId: { not: currentDepositRequestId },
      },
      include: {
        depositRequest: {
          select: { status: true },
        },
      },
    });

    const blockedStatuses = ['FUNDED', 'VERIFYING'];
    /*
 const blockedStatuses = [
      'VERIFIED',
      'FUNDED',
      'MANUALLY_APPROVED',
      'PENDING_MANUAL_REVIEW',
      'VERIFYING',
    ];
*/
    const hasBlockedDuplicate = existing.some((entry) =>
      blockedStatuses.includes(entry.depositRequest.status),
    );

    if (hasBlockedDuplicate) {
      return {
        pass: false,
        reasonCode: 'DUPLICATE_TRANSACTION',
        detail: `Transaction ID ${crawl.transactionId} was already used in another deposit request.`,
      };
    }

    return { pass: true };
  }
}
