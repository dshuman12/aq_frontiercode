import {
  ClientReceivingAccount,
  CrawlResult,
  DepositRequest,
  GatewayApiKey,
  GatewayCheckout,
  GatewayClient,
  Receipt,
  Transaction,
  User,
  Verification,
} from '@prisma/client';

type CheckoutWithRelations = GatewayCheckout & {
  depositRequest?: DepositRequest | null;
};

type DepositWithRelations = DepositRequest & {
  user: User;
  checkout: GatewayCheckout | null;
  receipt: Receipt | null;
  crawlResult: CrawlResult | null;
  verifications: Verification[];
  transaction: Transaction | null;
};

type TransactionWithRelations = Transaction & {
  depositRequest:
    | (DepositRequest & {
        user: User;
        checkout: GatewayCheckout | null;
        receipt: Receipt | null;
        crawlResult: CrawlResult | null;
      })
    | null;
};

export class AdminMapper {
  static client(client: GatewayClient) {
    return {
      id: client.id,
      name: client.name,
      slug: client.slug,
      logoUrl: client.logoUrl ?? null,
      webhookUrl: client.webhookUrl ?? null,
      isActive: client.isActive,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }

  static apiKey(apiKey: GatewayApiKey) {
    return {
      id: apiKey.id,
      label: apiKey.label ?? null,
      isActive: apiKey.isActive,
      apiKeyPreview: this.maskSecret(apiKey.apiKey),
      apiSecretPreview: this.maskSecret(apiKey.apiSecret),
      lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
      createdAt: apiKey.createdAt.toISOString(),
      revokedAt: apiKey.revokedAt?.toISOString() ?? null,
    };
  }

  static receivingAccount(account: ClientReceivingAccount) {
    return {
      id: account.id,
      paymentMethod: account.paymentMethod,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      isActive: account.isActive,
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  static checkout(checkout: CheckoutWithRelations) {
    return {
      id: checkout.id,
      invoiceId: checkout.invoiceId,
      amount: checkout.amount,
      productName: checkout.productName,
      customerName: checkout.customerName,
      customerEmail: checkout.customerEmail,
      userId: checkout.userId ?? null,
      status: checkout.status,
      transactionId: checkout.transactionId ?? null,
      webhookUrl: checkout.webhookUrl,
      successUrl: checkout.successUrl,
      cancelUrl: checkout.cancelUrl,
      failedUrl: checkout.failedUrl,
      expiresAt: checkout.expiresAt.toISOString(),
      webhookFiredAt: checkout.webhookFiredAt?.toISOString() ?? null,
      webhookResponse: checkout.webhookResponse ?? null,
      hasDepositRequest: Boolean(checkout.depositRequest),
      createdAt: checkout.createdAt.toISOString(),
      updatedAt: checkout.updatedAt.toISOString(),
    };
  }

  static deposit(deposit: DepositWithRelations) {
    return {
      id: deposit.id,
      userId: deposit.userId,
      amount: deposit.amount,
      paymentMethod: deposit.paymentMethod,
      status: deposit.status,
      retryCount: deposit.retryCount,
      maxRetries: deposit.maxRetries,
      rejectionReason: deposit.rejectionReason ?? null,
      reasonCode: deposit.reasonCode ?? null,
      adminNote: deposit.adminNote ?? null,
      createdAt: deposit.createdAt.toISOString(),
      updatedAt: deposit.updatedAt.toISOString(),
      user: {
        authId: deposit.user.authId,
        email: deposit.user.email ?? null,
        externalServiceId: deposit.user.externalServiceId ?? null,
        platformAccountId: deposit.user.platformAccountId ?? null,
        firstName: deposit.user.firstName ?? null,
        lastName: deposit.user.lastName ?? null,
        username: deposit.user.username ?? null,
      },
      checkout: deposit.checkout
        ? {
            id: deposit.checkout.id,
            invoiceId: deposit.checkout.invoiceId,
            status: deposit.checkout.status,
          }
        : null,
      receipt: deposit.receipt
        ? {
            id: deposit.receipt.id,
            type: deposit.receipt.type,
            rawLinkUrl: deposit.receipt.rawLinkUrl ?? null,
            rawSmsText: deposit.receipt.rawSmsText ?? null,
            screenshotPath: deposit.receipt.screenshotPath ?? null,
            telegramFileId: deposit.receipt.telegramFileId ?? null,
            extractedTransactionId:
              deposit.receipt.extractedTransactionId ?? null,
            submittedAt: deposit.receipt.submittedAt.toISOString(),
          }
        : null,
      crawlResult: deposit.crawlResult
        ? {
            id: deposit.crawlResult.id,
            transactionId: deposit.crawlResult.transactionId,
            paymentMethod: deposit.crawlResult.paymentMethod,
            responseType: deposit.crawlResult.responseType,
            confirmedAmount: deposit.crawlResult.confirmedAmount ?? null,
            confirmedReceiverName:
              deposit.crawlResult.confirmedReceiverName ?? null,
            confirmedReceiverAccount:
              deposit.crawlResult.confirmedReceiverAccount ?? null,
            confirmedTimestamp:
              deposit.crawlResult.confirmedTimestamp?.toISOString() ?? null,
            confirmedStatus: deposit.crawlResult.confirmedStatus ?? null,
            crawledAt: deposit.crawlResult.crawledAt.toISOString(),
          }
        : null,
      verifications: deposit.verifications.map((verification) => ({
        id: verification.id,
        check: verification.check,
        passed: verification.passed,
        reasonCode: verification.reasonCode ?? null,
        detail: verification.detail ?? null,
        ranAt: verification.ranAt.toISOString(),
      })),
      transaction: deposit.transaction
        ? {
            id: deposit.transaction.id,
            fundedAmount: deposit.transaction.fundedAmount,
            platformUserId: deposit.transaction.platformUserId,
            platformResponse: deposit.transaction.platformResponse,
            fundedAt: deposit.transaction.fundedAt.toISOString(),
          }
        : null,
    };
  }

  static transaction(transaction: TransactionWithRelations) {
    return {
      id: transaction.id,
      depositRequestId: transaction.depositRequestId,
      fundedAmount: transaction.fundedAmount,
      platformUserId: transaction.platformUserId,
      platformResponse: transaction.platformResponse,
      fundedAt: transaction.fundedAt.toISOString(),
      deposit: transaction.depositRequest
        ? {
            id: transaction.depositRequest.id,
            userId: transaction.depositRequest.userId,
            amount: transaction.depositRequest.amount,
            paymentMethod: transaction.depositRequest.paymentMethod,
            status: transaction.depositRequest.status,
            user: {
              authId: transaction.depositRequest.user.authId,
              email: transaction.depositRequest.user.email ?? null,
              username: transaction.depositRequest.user.username ?? null,
            },
            checkout: transaction.depositRequest.checkout
              ? {
                  id: transaction.depositRequest.checkout.id,
                  invoiceId: transaction.depositRequest.checkout.invoiceId,
                  status: transaction.depositRequest.checkout.status,
                }
              : null,
            receipt: transaction.depositRequest.receipt
              ? {
                  id: transaction.depositRequest.receipt.id,
                  type: transaction.depositRequest.receipt.type,
                  extractedTransactionId:
                    transaction.depositRequest.receipt.extractedTransactionId ??
                    null,
                }
              : null,
            crawlResult: transaction.depositRequest.crawlResult
              ? {
                  id: transaction.depositRequest.crawlResult.id,
                  transactionId:
                    transaction.depositRequest.crawlResult.transactionId,
                  confirmedAmount:
                    transaction.depositRequest.crawlResult.confirmedAmount ??
                    null,
                }
              : null,
          }
        : null,
    };
  }

  private static maskSecret(value: string) {
    if (value.length <= 8) return value;
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }
}
