import { CrawlResult, DepositRequest } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { PipeResult } from './duplicate-transaction.pipe';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ReceiverAccountMatchesPipe {
  constructor(private readonly prisma: PrismaService) {}

  async run(
    crawl: CrawlResult,
    depositRequest: DepositRequest,
  ): Promise<PipeResult> {
    if (!crawl.confirmedReceiverAccount) {
      return {
        pass: false,
        reasonCode: 'RECEIVER_UNREADABLE',
        detail: 'Could not read receiver account from bank response.',
      };
    }

    if (!depositRequest.clientId) {
      return {
        pass: false,
        reasonCode: 'NO_RECEIVING_ACCOUNT_CONFIGURED',
        detail:
          'Deposit request is missing client context, so no receiving account can be resolved.',
      };
    }

    const receivingAccount =
      await this.prisma.clientReceivingAccount.findUnique({
        where: {
          clientId_paymentMethod: {
            clientId: depositRequest.clientId,
            paymentMethod: depositRequest.paymentMethod,
          },
        },
      });

    if (!receivingAccount) {
      return {
        pass: false,
        reasonCode: 'NO_RECEIVING_ACCOUNT_CONFIGURED',
        detail: `No client receiving account configured for ${depositRequest.paymentMethod}.`,
      };
    }

    // ── Account check: last 4 digits must match ───────────────────────
    const last4 = (s: string) => s.replace(/\s/g, '').slice(-4);

    const receiptLast4 = last4(crawl.confirmedReceiverAccount);
    const expectedLast4 = last4(receivingAccount.accountNumber);

    if (receiptLast4 !== expectedLast4) {
      return {
        pass: false,
        reasonCode: 'RECEIVER_ACCOUNT_MISMATCH',
        detail: `Account ending in ${receiptLast4} does not match expected ...${expectedLast4}.`,
      };
    }

    // ── Name check: normalize both to uppercase and compare ───────────
    if (crawl.confirmedReceiverName && receivingAccount.accountName) {
      const normalizeName = (s: string) =>
        s.toUpperCase().replace(/\s+/g, ' ').trim();

      const receiptName = normalizeName(crawl.confirmedReceiverName);
      const expectedName = normalizeName(receivingAccount.accountName);

      if (receiptName !== expectedName) {
        return {
          pass: false,
          reasonCode: 'RECEIVER_NAME_MISMATCH',
          detail: `Receiver name "${crawl.confirmedReceiverName}" does not match expected "${receivingAccount.accountName}".`,
        };
      }
    }

    return { pass: true };
  }
}
