import { Injectable } from '@nestjs/common';
import { DepositStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

import {
  CreateCrawlResultInput,
  CreateDepositRequestInput,
  CreateReceiptInput,
  CreateVerificationCheckInput,
  PIPELINE_STATUS_MAP,
} from './type';
import { PipelineResult } from 'src/common/types/type';

@Injectable()
export class DepositTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Config ────────────────────────────────────────────────────────────────

  async getMaxRetries(): Promise<number> {
    const config = await this.prisma.adminConfig.findFirst({
      where: { key: 'max_try' },
    });
    return Number(config?.value ?? 5);
  }

  // ── DepositRequest ────────────────────────────────────────────────────────

  async createDepositRequest(input: CreateDepositRequestInput) {
    // 1. Check if a deposit already exists with this checkoutId
    const existing = input.checkoutId
      ? await this.prisma.depositRequest.findUnique({
          where: { checkoutId: input.checkoutId },
        })
      : null;

    // 2. If exists → handle retry logic
    if (existing) {
      // If already funded → block
      if (existing.status === 'FUNDED') {
        throw new Error('Deposit already completed for this checkoutId');
      }

      // If retry limit reached → block
      if (existing.retryCount >= existing.maxRetries) {
        throw new Error('Retry limit exceeded for this deposit request');
      }

      // Otherwise → update (retry case)
      return this.prisma.depositRequest.update({
        where: { id: existing.id },
        data: {
          amount: input.amount, // optional: allow update
          paymentMethod: input.paymentMethod,
          retryCount: {
            increment: 1,
          },
          status: 'VERIFYING', // reset if needed
        },
      });
    }

    // 3. If not exists → create new
    return this.prisma.depositRequest.create({
      data: {
        userId: input.userId,
        clientId: input.clientId ?? null,
        checkoutId: input.checkoutId ?? null,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        status: input.status ?? 'VERIFYING',
        retryCount: 0,
        maxRetries: input.maxRetries ?? 3,
      },
    });
  }

  async setDepositStatus(depositId: string, status: DepositStatus) {
    return this.prisma.depositRequest.update({
      where: { id: depositId },
      data: { status },
    });
  }

  async setDepositResult(depositId: string, result: PipelineResult) {
    return this.prisma.depositRequest.update({
      where: { id: depositId },
      data: {
        status: PIPELINE_STATUS_MAP[result.status] ?? 'REJECTED_HARD',
        rejectionReason:
          result.status !== 'PASS' ? (result as any).reason : null,
      },
    });
  }

  async findDepositById(depositId: string) {
    return this.prisma.depositRequest.findUnique({
      where: { id: depositId },
    });
  }

  // ── Receipt ───────────────────────────────────────────────────────────────

  async createReceipt(input: CreateReceiptInput) {
    return this.prisma.receipt.upsert({
      where: {
        depositRequestId: input.depositRequestId,
      },
      update: {
        type: input.verMethod as any,
        rawLinkUrl: input.verMethod === 'LINK' ? input.rawProof : null,
        rawSmsText: input.verMethod === 'SMS' ? input.rawProof : null,
        extractedTransactionId: input.extractedTransactionId ?? null,
      },
      create: {
        depositRequestId: input.depositRequestId,
        type: input.verMethod as any,
        rawLinkUrl: input.verMethod === 'LINK' ? input.rawProof : null,
        rawSmsText: input.verMethod === 'SMS' ? input.rawProof : null,
        extractedTransactionId: input.extractedTransactionId ?? null,
      },
    });
  }

  async setReceiptTransactionId(
    depositRequestId: string,
    transactionId: string,
  ) {
    return this.prisma.receipt.update({
      where: { depositRequestId },
      data: { extractedTransactionId: transactionId },
    });
  }

  // ── CrawlResult ───────────────────────────────────────────────────────────

  async createCrawlResult(input: CreateCrawlResultInput) {
    return this.prisma.crawlResult.upsert({
      where: {
        depositRequestId: input.depositRequestId,
      },
      update: {
        transactionId: input.transactionId,
        paymentMethod: input.paymentMethod,
        responseType:
          input.verMethod === 'LINK'
            ? 'HTML'
            : input.verMethod === 'SMS'
              ? 'JSON'
              : 'PDF',
        confirmedAmount: input.confirmedAmount,
        confirmedReceiverAccount: input.confirmedReceiverAccount,
        confirmedReceiverName: input.confirmedReceiverName,
        confirmedTimestamp: input.confirmedTimestamp,
        confirmedStatus: 'Success',
      },
      create: {
        depositRequestId: input.depositRequestId,
        transactionId: input.transactionId,
        paymentMethod: input.paymentMethod,
        responseType:
          input.verMethod === 'LINK'
            ? 'HTML'
            : input.verMethod === 'SMS'
              ? 'JSON'
              : 'PDF',
        confirmedAmount: input.confirmedAmount,
        confirmedReceiverAccount: input.confirmedReceiverAccount,
        confirmedReceiverName: input.confirmedReceiverName,
        confirmedTimestamp: input.confirmedTimestamp,
        confirmedStatus: 'Success',
      },
    });
  }

  // ── Verification check ────────────────────────────────────────────────────
  async createVerificationCheck(input: CreateVerificationCheckInput) {
    return this.prisma.verification.upsert({
      where: {
        depositRequestId_check: {
          depositRequestId: input.depositRequestId,
          check: input.check,
        },
      },
      update: {
        passed: input.passed,
        reasonCode: input.reasonCode,
        detail: input.detail,
      },
      create: {
        depositRequestId: input.depositRequestId,
        check: input.check,
        passed: input.passed,
        reasonCode: input.reasonCode,
        detail: input.detail,
      },
    });
  }

  async countDepositsByUser(userId: string): Promise<number> {
    return this.prisma.depositRequest.count({
      where: { userId: userId },
    });
  }

  async findDepositsByUser(userId: string, page: number, pageSize: number) {
    return this.prisma.depositRequest.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      skip: page * pageSize,
      take: pageSize,
      include: {
        crawlResult: { select: { transactionId: true } },
        receipt: { select: { extractedTransactionId: true } },
      },
    });
  }
  async updateDepositStatus(
    depositRequestId: string,
    status: DepositStatus,
  ): Promise<void> {
    await this.prisma.depositRequest.update({
      where: { id: depositRequestId },
      data: { status },
    });
  }

  async createTransaction(
    depositRequestId: string,
    userId: string,
    amount: number,
    clientId?: string | null,
  ): Promise<{ transactionId: string }> {
    const transaction = await this.prisma.transaction.create({
      data: {
        depositRequestId,
        clientId: clientId ?? null,
        fundedAmount: amount,
        platformUserId: userId,
        platformResponse: Prisma.JsonNull,
      },
    });
    return { transactionId: transaction.id };
  }
}
