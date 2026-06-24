import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CheckoutStatus, PaymentMethod } from '@prisma/client';
import { VerificationService } from 'src/verification/verification.service';
import { VerificationMethod } from 'src/common/types/bot-enum';
import { BulkDepositDto } from './bulk-deposit.dto';
import { SingleDepositDto } from './single-deposit.dto';
import { WebUser } from '../auth/web-auth.guard';
import { BulkReceiptInput } from 'src/verification/validators/type';
import { PipelineResult } from 'src/common/types/type';
import { BulkPipelineResult } from 'src/verification/validators/type';
import { SmsPreValidatorService } from 'src/common/pipes/sms.pipe';
import { BANK_URL_PIPE_REGISTRY } from 'src/common/pipes/bank-url-pipes.registry';

import { GatewayService } from 'src/gateway/gateway.service';

type SingleDepositResult = PipelineResult & { successUrl?: string };

@Injectable()
export class DepositWebService {
  private readonly logger = new Logger(DepositWebService.name);

  constructor(
    private readonly verifyService: VerificationService,
    private readonly smsPreValidator: SmsPreValidatorService,

    private readonly gatewayService: GatewayService,
  ) {}

  // ── Single deposit ────────────────────────────────────────────────────────
  //
  // Pre-flight: if verificationMethod is SMS, run the cheap regex check
  // against the rawProof BEFORE touching the full pipeline. Saves an OCR/
  // crawl call when the SMS is obviously wrong or from the wrong bank.

  async submitSingleDeposit(
    dto: SingleDepositDto,
    user: WebUser,
  ): Promise<SingleDepositResult> {
    let checkoutContext: Awaited<
      ReturnType<GatewayService['getCheckoutContext']>
    > | null = null;

    if (dto.checkoutId) {
      checkoutContext = await this.gatewayService.getCheckoutContext(
        dto.checkoutId,
        dto.paymentMethod,
      );

      if (checkoutContext.status !== CheckoutStatus.PENDING) {
        throw new BadRequestException('Checkout session is no longer pending.');
      }
    }

    // -----------------------------
    // 1. ROUTE VALIDATION BY METHOD
    // -----------------------------
    if (dto.verificationMethod === 'SMS') {
      const preCheck = this.smsPreValidator.validate(
        dto.rawProof ?? '',
        dto.paymentMethod,
        dto.verificationMethod as VerificationMethod,
      );

      if (!preCheck.valid) {
        throw new BadRequestException(preCheck.reason);
      }
    }

    if (dto.verificationMethod === 'LINK' && dto.rawProof) {
      const pipe = BANK_URL_PIPE_REGISTRY[dto.paymentMethod];

      if (!pipe) {
        throw new InternalServerErrorException(
          'pipe not configured try another method',
        );
      }

      try {
        pipe.transform(dto.rawProof.trim());
      } catch (e) {
        const msg =
          e instanceof BadRequestException
            ? e.message
            : '⚠️ Invalid receipt link.';
        throw new BadRequestException(msg);
      }
    }

    // -----------------------------
    // 2. MAIN VERIFICATION
    // -----------------------------
    let res: PipelineResult;

    try {
      res = await this.verifyService.verify({
        email: user.email,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        verMethod: dto.verificationMethod,
        rawProof: dto.rawProof ?? null,
        userId: user.userId,
        accountNumber:
          checkoutContext?.receivingAccountNumber ?? dto.accountNumber,
        clientId: checkoutContext?.clientId ?? dto.clientId ?? null,
        checkoutId: checkoutContext?.checkoutId ?? dto.checkoutId ?? null,
      });
    } catch (error: any) {
      throw new BadRequestException(
        error.message ?? 'unexpected error during verification',
      );
    }

    // -----------------------------
    // 3. SUCCESS FLOW
    // -----------------------------
    if (res.status === 'PASS') {
      if (dto.checkoutId) {
        const gatewayResult = await this.gatewayService.verifyCheckout(
          dto.checkoutId,
          {
            transactionId: res.transactionId,
            amount: dto.amount,
            email: user.email,
            depositId: res.depositRequestId,
          },
        );

        return {
          ...res,
          successUrl: gatewayResult.successUrl,
        };
      }
    }

    return res;
  }

  // ── Bulk deposit — single atomic flow ────────────────────────────────────
  //
  // Phase 0 — SMS pre-validation (fail-fast per receipt, before any DB/OCR)
  //   For SMS receipts, run the cheap regex check on every rawProof upfront.
  //   If any receipt fails, stop immediately — no pipeline calls wasted.
  //
  // Phase 1 — Extract all receipts server-side (fail-fast: stop at first error)
  //   The client only sends rawProof per receipt. The server calls
  //   extractBulkReceipt() for each one, which runs the full parser/OCR
  //   pipeline internally. The extracted data never comes from the client.
  //
  // Phase 2 — Total-match check
  //   Sum of extracted amounts must match declaredTotal within tolerance.
  //
  // Phase 3 — verifyBulk pipeline
  //   Writes DepositRequest + CrawlResult to DB per receipt, runs all
  //   verification pipes (duplicate, amount, receiver, timestamp).
  //   Fail-fast: stops at first receipt that fails, same as the bot scene.

  async submitBulkDeposit(
    dto: BulkDepositDto,
    user: WebUser,
  ): Promise<BulkPipelineResult> {
    // ── Phase 0: SMS pre-validation on all receipts before any pipeline ───
    // Validate all upfront so the user gets immediate feedback on bad SMS
    // text without waiting for receipt 1 to fully process before finding
    // out receipt 3 is wrong.
    const pipe = BANK_URL_PIPE_REGISTRY[dto.paymentMethod];
    if (!pipe)
      throw new InternalServerErrorException(
        'pipe not configured try another method',
      );
    for (let i = 0; i < dto.receipts.length; i++) {
      const r = dto.receipts[i];
      const receiptNumber = i + 1;

      const preCheck = this.smsPreValidator.validate(
        r.rawProof ?? '',
        dto.paymentMethod,
        dto.verificationMethod,
      );

      if (!preCheck.valid) {
        throw new BadRequestException(
          `Receipt ${receiptNumber} of ${dto.receipts.length}: ${preCheck.reason}`,
        );
      }

      if (r.rawProof && dto.verificationMethod === 'LINK')
        try {
          pipe.transform(r.rawProof.trim());
        } catch (e) {
          const msg =
            e instanceof BadRequestException
              ? e.message
              : `⚠️ Invalid receipt link${receiptNumber} of ${dto.receipts.length}: unrecognized link `;
          throw new BadRequestException(msg);
        }
    }

    // ── Phase 1: extract all receipts server-side ─────────────────────────
    const extractedReceipts: BulkReceiptInput[] = [];

    for (let i = 0; i < dto.receipts.length; i++) {
      const r = dto.receipts[i];
      const receiptNumber = i + 1;

      const result = await this.verifyService.extractBulkReceipt({
        paymentMethod: dto.paymentMethod,
        verMethod: dto.verificationMethod,
        rawProof: r.rawProof ?? null,
        telegramFileId: r.telegramFileId ?? null,
        amount: r.amount,
        userId: user.userId,
      });

      // Fail-fast: extraction error → stop immediately, same as bot scene
      if ('userMessage' in result) {
        throw new BadRequestException(
          `Receipt ${receiptNumber} of ${dto.receipts.length}: ${result.userMessage}`,
        );
      }

      extractedReceipts.push(result.data);
    }

    // ── Phase 2: total-match check ────────────────────────────────────────
    const receiptsTotal = extractedReceipts.reduce((s, r) => s + r.amount, 0);
    const tolerance = 0.01;

    if (Math.abs(receiptsTotal - dto.declaredTotal) > tolerance) {
      throw new BadRequestException(
        `Total mismatch: you declared ${dto.declaredTotal} ETB ` +
          `but your receipts sum to ${receiptsTotal.toFixed(2)} ETB.`,
      );
    }

    // ── Phase 3: run verification pipeline on all receipts ────────────────
    const res = await this.verifyService.verifyBulk({
      userId: user.userId,
      paymentMethod: dto.paymentMethod,
      verMethod: dto.verificationMethod,
      receipts: extractedReceipts,
      clientId: null,
      checkoutId: null,
    });
    if (res.status === 'PASS') {
      // await this.fund.executeBulk({
      //   email: user.email,
      //   amount: dto.declaredTotal,
      //   transaction: res.verifiedReceipts,
      // });
    }
    return res;
  }
}
