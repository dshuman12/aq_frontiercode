import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CheckoutStatus,
  DepositStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

type DateRangeInput = {
  from?: string;
  to?: string;
};

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findClientOrThrow(clientId: string) {
    const client = await this.prisma.gatewayClient.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new UnauthorizedException('Client not found.');
    }

    return client;
  }

  async getDashboard(clientId: string, now: Date) {
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
    const nextMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
    );

    const [
      totalApiKeys,
      activeApiKeys,
      totalAccounts,
      activeAccounts,
      checkoutsThisMonth,
      pendingCheckouts,
      depositsThisMonth,
      pendingDeposits,
      fundedTransactionsThisMonth,
      fundedAmountThisMonth,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.gatewayApiKey.count({ where: { clientId } }),
      this.prisma.gatewayApiKey.count({
        where: { clientId, isActive: true, revokedAt: null },
      }),
      this.prisma.clientReceivingAccount.count({ where: { clientId } }),
      this.prisma.clientReceivingAccount.count({
        where: { clientId, isActive: true },
      }),
      this.prisma.gatewayCheckout.count({
        where: { clientId, createdAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      this.prisma.gatewayCheckout.count({
        where: { clientId, status: CheckoutStatus.PENDING },
      }),
      this.prisma.depositRequest.count({
        where: { clientId, createdAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      this.prisma.depositRequest.count({
        where: {
          clientId,
          status: {
            in: [
              DepositStatus.PENDING_RECEIPT,
              DepositStatus.VERIFYING,
              DepositStatus.PENDING_MANUAL_REVIEW,
            ],
          },
        },
      }),
      this.prisma.transaction.count({
        where: { clientId, fundedAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      this.prisma.transaction.aggregate({
        where: { clientId, fundedAt: { gte: monthStart, lt: nextMonthStart } },
        _sum: { fundedAmount: true },
      }),
      this.prisma.transaction.findMany({
        where: { clientId },
        orderBy: { fundedAt: 'desc' },
        take: 10,
        include: {
          depositRequest: {
            include: {
              user: true,
              checkout: true,
              receipt: true,
              crawlResult: true,
            },
          },
        },
      }),
    ]);

    return {
      monthStart,
      overview: {
        totalApiKeys,
        activeApiKeys,
        totalAccounts,
        activeAccounts,
        checkoutsThisMonth,
        pendingCheckouts,
        depositsThisMonth,
        pendingDeposits,
        fundedTransactionsThisMonth,
        fundedAmountThisMonth: fundedAmountThisMonth._sum.fundedAmount ?? 0,
      },
      recentTransactions,
    };
  }

  async listApiKeys(clientId: string) {
    return this.prisma.gatewayApiKey.findMany({
      where: { clientId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createApiKey(
    clientId: string,
    apiKey: string,
    apiSecret: string,
    label?: string,
  ) {
    return this.prisma.gatewayApiKey.create({
      data: {
        clientId,
        apiKey,
        apiSecret,
        label: label?.trim() || null,
      },
    });
  }

  async revokeApiKey(clientId: string, apiKeyId: string) {
    const existing = await this.prisma.gatewayApiKey.findFirst({
      where: { id: apiKeyId, clientId },
    });

    if (!existing) {
      throw new NotFoundException('API key not found.');
    }

    return this.prisma.gatewayApiKey.update({
      where: { id: apiKeyId },
      data: {
        isActive: false,
        revokedAt: existing.revokedAt ?? new Date(),
      },
    });
  }

  async listReceivingAccounts(clientId: string) {
    return this.prisma.clientReceivingAccount.findMany({
      where: { clientId },
      orderBy: [{ isActive: 'desc' }, { paymentMethod: 'asc' }],
    });
  }

  async createReceivingAccount(input: {
    clientId: string;
    paymentMethod: PaymentMethod;
    accountNumber: string;
    accountName: string;
    isActive?: boolean;
  }) {
    return this.prisma.clientReceivingAccount.upsert({
      where: {
        clientId_paymentMethod: {
          clientId: input.clientId,
          paymentMethod: input.paymentMethod,
        },
      },
      update: {
        accountNumber: input.accountNumber.trim(),
        accountName: input.accountName.trim(),
        isActive: input.isActive ?? true,
      },
      create: {
        clientId: input.clientId,
        paymentMethod: input.paymentMethod,
        accountNumber: input.accountNumber.trim(),
        accountName: input.accountName.trim(),
        isActive: input.isActive ?? true,
      },
    });
  }

  async updateReceivingAccount(
    clientId: string,
    accountId: string,
    data: {
      paymentMethod?: PaymentMethod;
      accountNumber?: string;
      accountName?: string;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.clientReceivingAccount.findFirst({
      where: { id: accountId, clientId },
    });

    if (!existing) {
      throw new NotFoundException('Receiving account not found.');
    }

    return this.prisma.clientReceivingAccount.update({
      where: { id: accountId },
      data: {
        paymentMethod: data.paymentMethod,
        accountNumber: data.accountNumber?.trim(),
        accountName: data.accountName?.trim(),
        isActive: data.isActive,
      },
    });
  }

  async deleteReceivingAccount(clientId: string, accountId: string) {
    const existing = await this.prisma.clientReceivingAccount.findFirst({
      where: { id: accountId, clientId },
    });

    if (!existing) {
      throw new NotFoundException('Receiving account not found.');
    }

    return this.prisma.clientReceivingAccount.delete({
      where: { id: accountId },
    });
  }

  async listCheckouts(
    clientId: string,
    query: {
      page: number;
      pageSize: number;
      status?: CheckoutStatus;
      invoiceId?: string;
      checkoutId?: string;
      from?: string;
      to?: string;
    },
  ) {
    const where: Prisma.GatewayCheckoutWhereInput = {
      clientId,
      ...(query.status && { status: query.status }),
      ...(query.checkoutId?.trim() && {
        checkoutId: query.checkoutId.trim(),
      }),
      ...(query.invoiceId?.trim() && {
        invoiceId: {
          contains: query.invoiceId.trim(),
          mode: 'insensitive',
        },
      }),
      ...(query.checkoutId?.trim() && {
        checkoutId: {
          contains: query.checkoutId.trim(),
          mode: 'insensitive',
        },
      }),
      ...(this.buildDateRange(query) && {
        createdAt: this.buildDateRange(query),
      }),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.gatewayCheckout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
        include: {
          depositRequest: true,
        },
      }),
      this.prisma.gatewayCheckout.count({ where }),
    ]);

    return { items, total };
  }

  async getCheckoutDetail(clientId: string, checkoutId: string) {
    const checkout = await this.prisma.gatewayCheckout.findFirst({
      where: { id: checkoutId, clientId },
      include: {
        depositRequest: {
          include: {
            receipt: true,
            crawlResult: true,
            verifications: true,
            transaction: true,
            user: true,
          },
        },
      },
    });

    if (!checkout) {
      throw new NotFoundException('Checkout not found.');
    }

    return checkout;
  }

  async listDeposits(
    clientId: string,
    query: {
      page: number;
      pageSize: number;
      status?: DepositStatus;
      paymentMethod?: PaymentMethod;
      checkoutId?: string;
      userId?: string;
      from?: string;
      to?: string;
    },
  ) {
    const dateRange = this.buildDateRange(query);

    const where: Prisma.DepositRequestWhereInput = {
      clientId,

      ...(query.status && { status: query.status }),

      ...(query.paymentMethod && {
        paymentMethod: query.paymentMethod,
      }),

      ...(query.checkoutId?.trim() && {
        checkoutId: query.checkoutId.trim(),
      }),

      ...(query.userId?.trim() && {
        userId: {
          contains: query.userId.trim(),
          mode: 'insensitive',
        },
      }),

      ...(dateRange && {
        createdAt: dateRange,
      }),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.depositRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
        include: {
          user: true,
          checkout: true,
          receipt: true,
          crawlResult: true,
          verifications: true,
          transaction: true,
        },
      }),
      this.prisma.depositRequest.count({ where }),
    ]);

    return { items, total };
  }

  async getDepositDetail(clientId: string, depositId: string) {
    const deposit = await this.prisma.depositRequest.findFirst({
      where: { id: depositId, clientId },
      include: {
        user: true,
        checkout: true,
        receipt: true,
        crawlResult: true,
        verifications: {
          orderBy: { ranAt: 'asc' },
        },
        transaction: true,
      },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found.');
    }

    return deposit;
  }

  async listTransactions(
    clientId: string,
    query: {
      page: number;
      pageSize: number;
      depositRequestId?: string;
      platformUserId?: string;
      from?: string;
      to?: string;
    },
  ) {
    const dateRange = this.buildDateRange(query);

    const where: Prisma.TransactionWhereInput = {
      clientId,

      ...(query.depositRequestId?.trim() && {
        depositRequestId: query.depositRequestId.trim(),
      }),

      ...(query.platformUserId?.trim() && {
        platformUserId: {
          contains: query.platformUserId.trim(),
          mode: 'insensitive',
        },
      }),

      ...(dateRange && {
        fundedAt: dateRange,
      }),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { fundedAt: 'desc' },
        skip,
        take: query.pageSize,
        include: {
          depositRequest: {
            include: {
              user: true,
              checkout: true,
              receipt: true, // keep consistent with your schema
              crawlResult: true, // keep consistent with your schema
              verifications: true,
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { items, total };
  }

  async getTransactionDetail(clientId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, clientId },
      include: {
        depositRequest: {
          include: {
            user: true,
            checkout: true,
            receipt: true,
            crawlResult: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found.');
    }

    return transaction;
  }

  private buildDateRange(input: DateRangeInput) {
    const range: Prisma.DateTimeFilter = {};

    if (input.from) {
      range.gte = new Date(input.from);
    }

    if (input.to) {
      range.lte = new Date(input.to);
    }

    return Object.keys(range).length ? range : undefined;
  }
}
