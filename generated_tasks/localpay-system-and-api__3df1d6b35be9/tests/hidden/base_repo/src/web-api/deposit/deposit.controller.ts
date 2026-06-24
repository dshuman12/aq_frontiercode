import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WebAuthGuard } from '../auth/web-auth.guard';
import type { WebUser } from '../auth/web-auth.guard';
import { WebUserReq } from '../auth/web-user.decorator';
import { SingleDepositDto } from './single-deposit.dto';
import { BulkDepositDto } from './bulk-deposit.dto';
import { DepositWebService } from './deposit.web.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Throttle } from '@nestjs/throttler';

@UseGuards(WebAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('deposit')
export class DepositController {
  constructor(
    private readonly depositService: DepositWebService,
    private readonly prisma: PrismaService,
  ) {}

  // ── GET /api/deposit/receiving-account/:paymentMethod ────────────────────
  // Returns the bank account the user should send money to.
  // Called when the user selects a payment method on the frontend.

  @Get('receiving-account/:clientId/:checkoutId')
  async getReceivingAccount(
    @Param('clientId') clientId: string,
    @Param('checkoutId') checkoutId: string,
  ) {
    const resolvedClientId = clientId;
    console.log(clientId);
    if (!checkoutId) {
      throw new BadRequestException('your are tring smgt new buddy stop it ');
    }
    const account = await this.prisma.clientReceivingAccount.findMany({
      where: { clientId: resolvedClientId, isActive: true },
    });
    if (!account.length) return { available: false };
    return account.map((item) => ({
      paymentMethod: item.paymentMethod,
      accountNumber: item.accountNumber,
      accountName: item.accountName,
    }));
  }

  // ── POST /api/deposit/single ─────────────────────────────────────────────
  // Full single-deposit pipeline in one call:
  //   extract proof → run verification pipeline → return result
  //
  // Body: { amount, paymentMethod, verificationMethod, rawProof? }

  @Post('single')
  @HttpCode(HttpStatus.OK)
  @Throttle({ deposit: { ttl: 60_000, limit: 6 } })
  async submitSingleDeposit(
    @Body() dto: SingleDepositDto,
    @WebUserReq() user: WebUser,
  ) {
    console.log(dto);
    const result = await this.depositService.submitSingleDeposit(dto, user);

    return {
      status: result.status,
      depositRequestId: result.depositRequestId,
      ...(result.status === 'PASS' && {
        transactionId: (result as any).transactionId,
        message: 'Deposit verified successfully.',
        ...(('successUrl' in result &&
          result.successUrl && {
            successUrl: result.successUrl,
          }) ||
          {}),
      }),
      ...(result.status === 'FAIL_RETRYABLE' && {
        reason: (result as any).reason,
        message: 'Verification failed — you may retry.',
      }),
      ...(result.status === 'FAIL_HARD' && {
        reason: (result as any).reason,
        message: 'Verification failed. Please contact support.',
      }),
      ...(result.status === 'AMBIGUOUS' && {
        message:
          'Your receipt has been forwarded for manual review. We will notify you shortly.',
      }),
    };
  }

  // ── POST /api/deposit/bulk ───────────────────────────────────────────────
  // Full bulk-deposit pipeline in ONE atomic call:
  //
  //   Phase 1 — Extract all receipts server-side (fail-fast at first error)
  //             Client sends only rawProof per receipt. The server runs
  //             extractBulkReceipt() internally — extracted data never comes
  //             from the client, so there is no way to inject fake parsed data.
  //
  //   Phase 2 — Total-match check
  //             Sum of server-extracted amounts vs declaredTotal.
  //
  //   Phase 3 — verifyBulk pipeline
  //             Writes DB records + runs all verification pipes per receipt.
  //             Stops at first receipt that fails (fail-fast, same as bot).
  //
  // Body: { declaredTotal, paymentMethod, verificationMethod, receipts: [{ amount, rawProof? }] }
  @Throttle({ deposit: { ttl: 60_000, limit: 5 } })
  // not yet ready for prod @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async submitBulkDeposit(
    @Body() dto: BulkDepositDto,
    @WebUserReq() user: WebUser,
  ) {
    const result = await this.depositService.submitBulkDeposit(dto, user);

    if (result.status === 'PASS') {
      return {
        status: 'PASS',
        message: `All ${result.verifiedReceipts.length} receipts verified successfully.`,
        receipts: result.verifiedReceipts.map((v, i) => ({
          index: i + 1,
          depositRequestId: v.depositRequestId,
          transactionId: v.transactionId,
          amount: v.amount,
        })),
      };
    }

    if (result.status === 'AMBIGUOUS') {
      return {
        status: 'AMBIGUOUS',
        failedIndex: result.failedIndex,
        depositRequestId: result.depositRequestId,
        message: `Receipt ${result.failedIndex} has been forwarded for manual review.`,
      };
    }

    // FAIL
    return {
      status: 'FAIL',
      failedIndex: result.failedIndex,
      reason: result.reason,
      message: `Receipt ${result.failedIndex} failed verification: ${result.reason}`,
    };
  }
}
