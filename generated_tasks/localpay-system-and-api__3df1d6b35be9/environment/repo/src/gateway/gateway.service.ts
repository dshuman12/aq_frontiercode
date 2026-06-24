import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { VerifyCheckoutDto } from './dto/verify-checkout.dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CheckoutTokenService } from './checkout-url-builder';
import { DepositTransactionRepository } from 'src/transactions/transactions.service';
import {
  CheckoutStatus,
  DepositStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { LruCacheService } from 'src/common/cache/lru-cache.service';
import { VerifyPaymentDto } from './dto/Verify-payment.dto';

@Injectable()
export class GatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly token: CheckoutTokenService,
    private readonly transaction: DepositTransactionRepository,
    private readonly cache: LruCacheService,
  ) {}

  async createCheckout(dto: CreateCheckoutDto, idempotencyKey?: string) {
    const apiKey = await this.prisma.gatewayApiKey.findFirst({
      where: {
        apiKey: dto.api_key,
        apiSecret: dto.api_secret,
        isActive: true,
        revokedAt: null,
        client: { isActive: true },
      },
      include: { client: true },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API credentials.');
    }

    const now = new Date();

    const expiresInSeconds =
      dto.expires_in_seconds ??
      Number(this.config.get('GATEWAY_CHECKOUT_EXPIRES_IN_SECONDS') ?? 1800);

    const newExpiry = new Date(Date.now() + expiresInSeconds * 1000);

    let checkout;
    try {
      checkout = await this.prisma.$transaction(
        (tx) =>
          this.createOrRefreshCheckout(
            tx,
            apiKey.clientId,
            dto,
            now,
            newExpiry,
          ),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (!this.isCheckoutConcurrencyError(error)) {
        throw error;
      }

      checkout = await this.prisma.$transaction(
        (tx) =>
          this.createOrRefreshCheckout(
            tx,
            apiKey.clientId,
            dto,
            now,
            newExpiry,
          ),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }

    this.invalidateDashboardCache(apiKey.clientId);
    return this.buildCheckoutResponse(checkout, apiKey.client);
  }

  async getCheckoutContext(checkoutId: string, paymentMethod?: PaymentMethod) {
    const checkout = (
      paymentMethod
        ? await this.prisma.gatewayCheckout.findUnique({
            where: { id: checkoutId },
            include: {
              client: {
                include: {
                  receivingAccounts: {
                    where: { paymentMethod, isActive: true },
                  },
                },
              },
            },
          })
        : await this.prisma.gatewayCheckout.findUnique({
            where: { id: checkoutId },
            include: { client: true },
          })
    ) as any;

    if (!checkout) {
      throw new NotFoundException('Checkout session not found.');
    }

    if (checkout.expiresAt <= new Date()) {
      throw new BadRequestException('Checkout session has expired.');
    }

    const receivingAccount = paymentMethod
      ? (checkout.client.receivingAccounts[0] ?? null)
      : null;

    return {
      checkoutId: checkout.id,
      clientId: checkout.clientId,
      userId: checkout.userId,
      invoiceId: checkout.invoiceId,
      status: checkout.status,
      receivingAccountNumber: receivingAccount?.accountNumber ?? null,
    };
  }

  async verifyCheckout(checkoutId: string, dto: VerifyCheckoutDto) {
    const session = await this.prisma.gatewayCheckout.findUnique({
      where: { id: checkoutId },
    });

    if (!session) throw new NotFoundException('Checkout session not found.');
    if (session.status === 'PAID')
      throw new BadRequestException(
        'Already paid and Funded with this transaction buddy.',
      );

    // Mark as paid
    await this.prisma.gatewayCheckout.update({
      where: { id: checkoutId },
      data: { status: 'PAID', transactionId: dto.transactionId },
    });

    // Fire webhook back to their platform
    // await fetch(session.webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     TrxID: dto.transactionId,
    //     CheckoutID: checkoutId,
    //     InvoiceID: session.invoiceId,
    //     Status: 'Paid',
    //   }),
    // });
    await this.transaction.updateDepositStatus(
      dto.depositId,
      DepositStatus.FUNDED,
    );
    await this.transaction.createTransaction(
      dto.depositId,
      session.userId ?? dto.email ?? '',
      dto.amount,
      session.clientId,
    );
    this.invalidateDashboardCache(session.clientId);
    return { successUrl: session.successUrl };
  }
  async verifyPayment(dto: VerifyPaymentDto) {
    const session = await this.prisma.gatewayCheckout.findUnique({
      where: { id: dto.CheckoutID },
    });

    if (!session) {
      throw new NotFoundException('Checkout session not found.');
    }

    // InvoiceID must match what we stored
    if (session.invoiceId !== String(dto.InvoiceID)) {
      throw new BadRequestException('InvoiceID mismatch.');
    }

    // Session must be PAID — if it's still PENDING the deposit wasn't verified
    if (session.status !== 'PAID') {
      throw new BadRequestException('Payment has not been verified yet.');
    }

    // TrxID must match what we stored from the bank receipt
    if (session.transactionId !== dto.TrxID) {
      throw new BadRequestException('TrxID mismatch.');
    }

    return { Status: 'Paid' };
  }

  private async createOrRefreshCheckout(
    tx: Prisma.TransactionClient,
    clientId: string,
    dto: CreateCheckoutDto,
    now: Date,
    newExpiry: Date,
  ) {
    const existing = await tx.gatewayCheckout.findFirst({
      where: {
        clientId,
        invoiceId: dto.invoice_id,
      },
    });

    if (!existing) {
      return tx.gatewayCheckout.create({
        data: {
          clientId,
          invoiceId: dto.invoice_id,
          amount: dto.amount,
          webhookUrl: dto.webhook_url,
          successUrl: dto.success_url,
          cancelUrl: dto.cancel_url,
          failedUrl: dto.failed_url,
          customerEmail: dto.customer_email,
          customerName: dto.customer_name,
          productName: dto.product_name,
          userId: dto.userId,
          status: CheckoutStatus.PENDING,
          expiresAt: newExpiry,
        },
      });
    }

    if (existing.status === CheckoutStatus.PAID) {
      throw new BadRequestException(
        'Checkout already paid for this invoice.',
      );
    }

    const isActivePending =
      existing.status === CheckoutStatus.PENDING && existing.expiresAt >= now;

    if (isActivePending) {
      return existing;
    }

    return tx.gatewayCheckout.update({
      where: { id: existing.id },
      data: {
        amount: dto.amount,
        webhookUrl: dto.webhook_url,
        successUrl: dto.success_url,
        cancelUrl: dto.cancel_url,
        failedUrl: dto.failed_url,
        customerEmail: dto.customer_email,
        customerName: dto.customer_name,
        productName: dto.product_name,
        userId: dto.userId,
        status: CheckoutStatus.PENDING,
        transactionId: null,
        expiresAt: newExpiry,
      },
    });
  }

  private isCheckoutConcurrencyError(error: unknown) {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }

    return error.code === 'P2002' || error.code === 'P2034';
  }

  private async buildCheckoutResponse(checkout, client) {
    const token = await this.token.buildCheckoutToken({
      userId: checkout.userId,
      email: checkout.customerEmail,
      invoiceId: checkout.invoiceId,
      checkoutId: checkout.id,
      amount: checkout.amount,
      clientId: client.id,
    });

    return {
      status: 'success',
      checkoutID: checkout.id,
      checkoutUrl: `${this.config.get('FRONTEND_URL')}/deposit/${token}`,
      client: {
        id: client.id,
        slug: client.slug,
        name: client.name,
      },
    };
  }

  private invalidateDashboardCache(clientId: string) {
    this.cache.delete(`admin-dashboard:${clientId}`);
  }
}
