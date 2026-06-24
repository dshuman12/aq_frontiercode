import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethod, VerificationMethod } from '../common/types/bot-enum';
import { GenericValidation } from './validators/validation.generic';
import {
  DuplicateTransactionPipe,
  PipeResult,
} from './common/validation-pipes/duplicate-transaction.pipe';
import { CrawlResult, DepositRequest, VerificationCheck } from '@prisma/client';
import { AmountMatchesPipe } from './common/validation-pipes/amount-matches.pipe';
import { ReceiverAccountMatchesPipe } from './common/validation-pipes/receiver-account-matches.pipe';
import { TimestampValidPipe } from './common/validation-pipes/timestamp-valid.pipe';
import { parseDate, safeParsDate } from './common/type';
import { PipelineStageError, VerificationError } from './Verification.errors ';
import { DepositTransactionRepository } from 'src/transactions/transactions.service';
import {
  BulkPipelineResult,
  BulkReceiptInput,
  BulkVerifyPayload,
  ExtractReceiptPayload,
  SingleVerifyPayload,
  UNEXPECTED_ERROR_MESSAGE,
  VerificationOptions,
  VerificationStage,
} from './validators/type';
import { PipelineResult } from 'src/common/types/type';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly generic: GenericValidation,
    private readonly repo: DepositTransactionRepository,
    private readonly duplicatePipe: DuplicateTransactionPipe,
    private readonly amountPipe: AmountMatchesPipe,
    private readonly receiverPipe: ReceiverAccountMatchesPipe,
    private readonly timestampPipe: TimestampValidPipe,
  ) {}

  // ── Public: single deposit ────────────────────────────────────────────────

  async verify(
    payload: SingleVerifyPayload,
    options?: VerificationOptions,
  ): Promise<PipelineResult> {
    const depositRequest = await this.initDeposit(payload);
    const depositRequestId = depositRequest.id.toString();

    await this.reportStage(
      options?.onStage,
      'request-recorded',
      depositRequestId,
    );

    const extracted = await this.extractFromProof(
      payload,
      depositRequest.id,
      depositRequestId,
      options,
    );
    if (!extracted) return { status: 'AMBIGUOUS', depositRequestId };

    const crawl = await this.repo.createCrawlResult({
      depositRequestId: depositRequest.id,
      transactionId: extracted.transactionNumber,
      paymentMethod: payload.paymentMethod,
      verMethod: payload.verMethod,
      confirmedAmount: parseFloat(extracted.amount),
      confirmedReceiverAccount: extracted.receiverAccount,
      confirmedReceiverName: extracted.receiverName,
      confirmedTimestamp: extracted.date ? safeParsDate(extracted.date) : null,
    });

    await this.repo.setReceiptTransactionId(
      depositRequest.id,
      extracted.transactionNumber,
    );

    return this.finalizeDeposit(
      depositRequest,
      crawl,
      depositRequestId,
      options,
    );
  }

  // ── Public: bulk extract (one receipt during upload loop) ─────────────────

  async extractBulkReceipt(
    payload: ExtractReceiptPayload,
  ): Promise<{ data: BulkReceiptInput } | { userMessage: string }> {
    const raw = await this.callGenericVerify(payload);
    if ('userMessage' in raw) return raw;

    const receipt = raw.receipt?.receipt;
    if (!receipt) {
      return {
        userMessage:
          `We could not read your receipt. ` +
          `Please make sure it is clear and complete, then try again.`,
      };
    }

    return {
      data: {
        amount: parseFloat(receipt.amount),
        date: receipt.date
          ? new Date(parseDate(receipt.date)).toISOString()
          : new Date().toISOString(),
        bankName: payload.paymentMethod,
        transactionId: receipt.transactionNumber,
        receiverAccount: receipt.receiverAccount,
        receiverName: receipt.receiverName,
        rawProof: payload.rawProof,
        telegramFileId: payload.telegramFileId,
      },
    };
  }

  // ── Public: bulk verify (after all receipts collected) ────────────────────

  async verifyBulk(payload: BulkVerifyPayload): Promise<BulkPipelineResult> {
    const maxRetries = await this.repo.getMaxRetries();
    const verifiedReceipts: Array<{
      depositRequestId: string;
      transactionId: string;
      amount: number;
    }> = [];

    for (let i = 0; i < payload.receipts.length; i++) {
      const { depositRequest, crawl } = await this.recordBulkReceipt(
        payload.receipts[i],
        payload,
        maxRetries,
      );

      const stopResult = await this.runBulkPipeline(
        depositRequest,
        crawl,
        i + 1,
        payload,
      );

      if (stopResult) return stopResult;

      verifiedReceipts.push({
        depositRequestId: depositRequest.id.toString(),
        transactionId: crawl.transactionId,
        amount: payload.receipts[i].amount,
      });
    }

    return { status: 'PASS', verifiedReceipts };
  }

  // ── Public: shared pipeline (used by single + bulk) ───────────────────────

  async runPipeline(
    depositRequest: DepositRequest,
    crawl: CrawlResult,
    onStage?: VerificationOptions['onStage'],
  ): Promise<PipelineResult> {
    const depositRequestId = depositRequest.id.toString();

    const pipes: Array<{
      check: VerificationCheck;
      stage: VerificationStage;
      run: () => Promise<PipeResult> | PipeResult;
    }> = [
      {
        check: VerificationCheck.DUPLICATE_CHECK,
        stage: 'duplicate-check',
        run: () => this.duplicatePipe.run(crawl, depositRequest.id),
      },
      {
        check: VerificationCheck.AMOUNT_MATCH,
        stage: 'amount-check',
        run: () => this.amountPipe.run(crawl, depositRequest),
      },
      {
        check: VerificationCheck.RECEIVER_ACCOUNT_MATCH,
        stage: 'receiver-check',
        run: () => this.receiverPipe.run(crawl, depositRequest),
      },
      {
        check: VerificationCheck.TIMESTAMP_FRESHNESS,
        stage: 'timestamp-check',
        run: () => this.timestampPipe.run(crawl),
      },
    ];

    for (const { check, run, stage } of pipes) {
      await this.reportStage(onStage, stage, depositRequestId);
      const result = await this.runPipeStep(run, stage);
      await this.repo.createVerificationCheck({
        depositRequestId: depositRequest.id,
        check,
        passed: result.pass,
        reasonCode: result.reasonCode ?? null,
        detail: result.detail ?? null,
      });

      if (!result.pass)
        return this.buildPipeFailResult(result, depositRequestId);
    }

    return {
      status: 'PASS',
      transactionId: crawl.transactionId,
      depositRequestId,
    };
  }

  // ── Private: single deposit setup ────────────────────────────────────────

  private async initDeposit(payload: SingleVerifyPayload) {
    const maxRetries = await this.repo.getMaxRetries();

    const depositRequest = await this.repo.createDepositRequest({
      userId: payload.userId,
      clientId: payload.clientId,
      checkoutId: payload.checkoutId,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      status: 'PENDING_RECEIPT',
      maxRetries,
    });

    await this.repo.createReceipt({
      depositRequestId: depositRequest.id,
      verMethod: payload.verMethod,
      rawProof: payload.rawProof,
      telegramFileId: payload.telegramFileId ?? null,
    });

    await this.repo.setDepositStatus(depositRequest.id, 'VERIFYING');

    return depositRequest;
  }

  // ── Private: extraction ───────────────────────────────────────────────────
  //
  // Calls generic.verify(), handles errors, reports stage updates.
  // Returns the raw receipt object on success, or null if extraction failed
  // (caller should return AMBIGUOUS — the deposit is already marked in DB).

  private async extractFromProof(
    payload: SingleVerifyPayload,
    depositId: string,
    depositRequestId: string,
    options?: VerificationOptions,
  ) {
    await this.reportStage(
      options?.onStage,
      'extracting-details',
      depositRequestId,
    );

    let extractionResult: Awaited<ReturnType<typeof this.generic.verify>>;
    try {
      extractionResult = await this.generic.verify({
        verMethod: payload.verMethod,
        bank: payload.paymentMethod as PaymentMethod,
        rawProof: payload.rawProof ?? '',
        userId: payload.userId,
        telegramFileId: payload.telegramFileId ?? '',
        amount: payload.amount,
        accountNumber: payload.accountNumber,
      });
    } catch (err) {
      console.error('❌ REAL ERROR:', err);
      throw new Error(
        'Failed to get any response form Your Proof please double check your proof ',
      );
    }

    if (extractionResult.status !== 'SUCCESS' || !extractionResult.receipt) {
      await this.repo.setDepositStatus(depositId, 'REJECTED_HARD');
      await this.reportStage(
        options?.onStage,
        'finalizing',
        depositRequestId,
        'AMBIGUOUS',
      );
      throw new Error(
        'No receipt Found From Your response please double check your proof',
      );
    }

    const isInvalid = (value: string) =>
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '');

    const receipt = extractionResult.receipt.receipt; // adjust if nested

    if (
      isInvalid(receipt.amount) ||
      isInvalid(receipt.date) ||
      isInvalid(receipt.receiverName) ||
      isInvalid(receipt.transactionNumber) ||
      isInvalid(receipt.receiverAccount)
    ) {
      throw new Error(
        'Failed to extract the expected data from the proof please double check your proof ',
      );
    }
    return receipt;
  }

  // ── Private: finalize single deposit after pipeline ───────────────────────

  private async finalizeDeposit(
    depositRequest: DepositRequest,
    crawl: CrawlResult,
    depositRequestId: string,
    options?: VerificationOptions,
  ): Promise<PipelineResult> {
    const pipelineResult = await this.runPipeline(
      depositRequest,
      crawl,
      options?.onStage,
    );

    await this.repo.setDepositResult(depositRequest.id, pipelineResult);
    await this.reportStage(
      options?.onStage,
      'finalizing',
      depositRequestId,
      pipelineResult.status,
    );

    if (pipelineResult.status === 'PASS') {
      return {
        status: 'PASS',
        transactionId: crawl.transactionId,
        depositRequestId,
      };
    }

    return pipelineResult;
  }

  // ── Private: bulk receipt DB setup ───────────────────────────────────────
  //
  // Creates DepositRequest + Receipt + CrawlResult for one bulk receipt.
  // Returns both so runBulkPipeline can use them immediately.

  private async recordBulkReceipt(
    r: BulkReceiptInput,
    payload: BulkVerifyPayload,
    maxRetries: number,
  ) {
    const depositRequest = await this.repo.createDepositRequest({
      userId: payload.userId,
      clientId: payload.clientId,
      checkoutId: payload.checkoutId,
      amount: r.amount,
      paymentMethod: payload.paymentMethod,
      status: 'VERIFYING',
      maxRetries,
    });

    await this.repo.createReceipt({
      depositRequestId: depositRequest.id,
      verMethod: payload.verMethod,
      rawProof: r.rawProof,
      telegramFileId: r.telegramFileId,
      extractedTransactionId: r.transactionId,
    });

    const crawl = await this.repo.createCrawlResult({
      depositRequestId: depositRequest.id,
      transactionId: r.transactionId,
      paymentMethod: payload.paymentMethod,
      verMethod: payload.verMethod,
      confirmedAmount: r.amount,
      confirmedReceiverAccount: r.receiverAccount,
      confirmedReceiverName: r.receiverName,
      confirmedTimestamp: r.date ? new Date(r.date) : null,
    });

    return { depositRequest, crawl };
  }

  // ── Private: run pipeline for one bulk receipt ────────────────────────────
  //
  // Returns a BulkPipelineResult stop value (FAIL or AMBIGUOUS) if the
  // receipt didn't pass, or null if it passed so the loop can continue.

  private async runBulkPipeline(
    depositRequest: DepositRequest,
    crawl: CrawlResult,
    failedIndex: number,
    payload: BulkVerifyPayload,
  ): Promise<Extract<
    BulkPipelineResult,
    { status: 'FAIL' | 'AMBIGUOUS' }
  > | null> {
    let pipelineResult: PipelineResult;
    try {
      pipelineResult = await this.runPipeline(depositRequest, crawl);
    } catch (err) {
      const reason = this.logAndExtractMessage(err, 'verifyBulk.runPipeline', {
        stage: 'duplicate-check',
        bank: payload.paymentMethod as PaymentMethod,
        method: payload.verMethod,
      });
      await this.repo.setDepositStatus(depositRequest.id, 'REJECTED_HARD');
      return { status: 'FAIL', failedIndex, reason };
    }

    await this.repo.setDepositResult(depositRequest.id, pipelineResult);

    if (pipelineResult.status === 'AMBIGUOUS') {
      return {
        status: 'AMBIGUOUS',
        failedIndex,
        depositRequestId: pipelineResult.depositRequestId,
      };
    }

    if (pipelineResult.status !== 'PASS') {
      return {
        status: 'FAIL',
        failedIndex,
        reason: (pipelineResult as any).reason,
      };
    }

    return null; // pass — continue loop
  }

  // ── Private: generic.verify wrapper for bulk extraction ───────────────────
  //
  // Calls generic.verify, catches errors, and returns either the receipt
  // result or a userMessage string — no throwing escapes this boundary.

  private async callGenericVerify(
    payload: ExtractReceiptPayload,
  ): Promise<
    | { receipt: Awaited<ReturnType<GenericValidation['verify']>>['receipt'] }
    | { userMessage: string }
  > {
    let result: Awaited<ReturnType<typeof this.generic.verify>>;
    try {
      result = await this.generic.verify({
        bank: payload.paymentMethod as PaymentMethod,
        verMethod: payload.verMethod,
        rawProof: payload.rawProof ?? '',
        telegramFileId: payload.telegramFileId ?? '',
        amount: payload.amount,
        userId: payload.userId,
      });
    } catch (err) {
      return {
        userMessage: this.logAndExtractMessage(err, 'extractBulkReceipt', {
          bank: payload.paymentMethod as PaymentMethod,
          method: payload.verMethod,
          stage: 'extracting-details',
        }),
      };
    }

    if (result.status !== 'SUCCESS' || !result.receipt) {
      return {
        userMessage:
          `We could not read your receipt. ` +
          `Please make sure it is clear and complete, then try again.`,
      };
    }

    return { receipt: result.receipt };
  }

  // ── Private: run a single pipe step safely ────────────────────────────────
  //
  // Wraps the pipe execution — if the pipe throws unexpectedly,
  // it becomes a PipelineStageError with the stage attached.

  private async runPipeStep(
    run: () => Promise<PipeResult> | PipeResult,
    stage: VerificationStage,
  ): Promise<PipeResult> {
    try {
      return await run();
    } catch (cause) {
      throw new PipelineStageError(stage, cause);
    }
  }

  // ── Private: build FAIL_HARD or FAIL_RETRYABLE from a pipe result ─────────

  private buildPipeFailResult(
    result: PipeResult,
    depositRequestId: string,
  ): PipelineResult {
    const hardFailCodes = [
      'DUPLICATE_TRANSACTION',
      'RECEIVER_ACCOUNT_MISMATCH',
      'TIMESTAMP_FUTURE',
    ];

    const status = hardFailCodes.includes(result.reasonCode ?? '')
      ? 'FAIL_HARD'
      : 'FAIL_RETRYABLE';

    return { status, reason: result.detail!, depositRequestId };
  }

  // ── Private: handle extraction failure ────────────────────────────────────
  //
  // Logs the error with full context, marks the deposit for manual review.
  // The caller returns AMBIGUOUS — we don't hard reject since the payment
  // may have gone through even if extraction failed.

  private async handleExtractionFailure(
    err: unknown,
    depositId: string,
    depositRequestId: string,
    onStage?: VerificationOptions['onStage'],
  ) {
    this.logAndExtractMessage(err, 'verify.extraction', {
      stage: 'extracting-details',
    });
    await this.repo.setDepositStatus(depositId, 'PENDING_MANUAL_REVIEW');
    await this.reportStage(
      onStage,
      'finalizing',
      depositRequestId,
      'AMBIGUOUS',
    );
  }

  // ── Private: log error and return user message ────────────────────────────
  //
  // Typed errors (VerificationError subclasses) log structured context.
  // Unknown errors log everything available as a fallback.
  // Always returns a clean user-facing string — nothing raw escapes.

  private logAndExtractMessage(
    err: unknown,
    source: string,
    context: {
      stage?: VerificationStage;
      bank?: PaymentMethod;
      method?: VerificationMethod;
    },
  ): string {
    if (err instanceof VerificationError) {
      this.logger.error(`[${source}] ${err.name}: ${err.message}`, {
        stage: context.stage,
        bank: context.bank,
        method: context.method,
        cause: (err as any).cause,
      });
      return err.userMessage;
    }

    this.logger.error(`[${source}] Unexpected error`, {
      stage: context.stage,
      bank: context.bank,
      method: context.method,
      error: err,
    });
    return UNEXPECTED_ERROR_MESSAGE;
  }

  // ── Private: stage reporting ──────────────────────────────────────────────

  private async reportStage(
    onStage: VerificationOptions['onStage'] | undefined,
    stage: VerificationStage,
    depositRequestId: string,
    detail?: string,
  ) {
    if (!onStage) return;
    await onStage({ stage, depositRequestId, detail });
  }
}
