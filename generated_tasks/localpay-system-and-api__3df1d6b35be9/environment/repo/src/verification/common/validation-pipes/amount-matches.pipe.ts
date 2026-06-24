import { CrawlResult, DepositRequest } from '@prisma/client';
import { PipeResult } from './duplicate-transaction.pipe';
import { Injectable } from '@nestjs/common';

const TOLERANCE = 0.01;
@Injectable()
export class AmountMatchesPipe {
  run(crawl: CrawlResult, depositRequest: DepositRequest): PipeResult {
    if (crawl.confirmedAmount === null || crawl.confirmedAmount === undefined) {
      return {
        pass: false,
        reasonCode: 'AMOUNT_UNREADABLE',
        detail: 'Could not read confirmed amount from bank response.',
      };
    }

    const diff = Math.abs(crawl.confirmedAmount - depositRequest.amount);

    if (diff > TOLERANCE) {
      return {
        pass: false,
        reasonCode: 'AMOUNT_MISMATCH',
        detail: `Receipt shows ${crawl.confirmedAmount} ETB but deposit request is for ${depositRequest.amount} ETB.`,
      };
    }

    return { pass: true };
  }
}
