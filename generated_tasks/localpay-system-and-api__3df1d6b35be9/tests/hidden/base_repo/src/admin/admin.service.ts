import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { LruCacheService } from 'src/common/cache/lru-cache.service';
import { AdminMapper } from './admin.mapper';
import { AdminRepository } from './admin.repository';
import { CreateApiKeyDto } from './dto/api-key.dto';
import {
  CreateReceivingAccountDto,
  UpdateReceivingAccountDto,
} from './dto/account.dto';
import {
  CheckoutListQueryDto,
  DepositListQueryDto,
  PaginationQueryDto,
  TransactionListQueryDto,
} from './dto/admin-query.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly dashboardTtlMs: number;

  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly cache: LruCacheService,
    private readonly config: ConfigService,
  ) {
    const configuredTtl = Number(
      this.config.get('ADMIN_DASHBOARD_CACHE_TTL_MS'),
    );
    this.dashboardTtlMs =
      Number.isFinite(configuredTtl) && configuredTtl > 0
        ? configuredTtl
        : 15_000;
  }

  async getDashboard(clientId: string) {
    return this.cache.getOrSet(
      this.getDashboardCacheKey(clientId),
      async () => {
        const client = await this.adminRepository.findClientOrThrow(clientId);
        const dashboard = await this.adminRepository.getDashboard(
          clientId,
          new Date(),
        );

        return {
          client: AdminMapper.client(client),
          overview: {
            ...dashboard.overview,
            monthStart: dashboard.monthStart.toISOString(),
          },
          recentTransactions: dashboard.recentTransactions.map((item) =>
            AdminMapper.transaction(item),
          ),
        };
      },
      this.dashboardTtlMs,
    );
  }

  async listApiKeys(clientId: string) {
    const client = await this.adminRepository.findClientOrThrow(clientId);
    const apiKeys = await this.adminRepository.listApiKeys(clientId);

    return {
      client: AdminMapper.client(client),
      total: apiKeys.length,
      items: apiKeys.map((item) => AdminMapper.apiKey(item)),
    };
  }

  async createApiKey(clientId: string, dto: CreateApiKeyDto) {
    await this.adminRepository.findClientOrThrow(clientId);

    for (let attempt = 0; attempt < 3; attempt++) {
      const apiKey = `hk_${randomBytes(18).toString('hex')}`;
      const apiSecret = `hs_${randomBytes(24).toString('hex')}`;

      try {
        const created = await this.adminRepository.createApiKey(
          clientId,
          apiKey,
          apiSecret,
          dto.label,
        );

        this.invalidateDashboardCache(clientId);
        return {
          item: AdminMapper.apiKey(created),
          credentials: {
            apiKey: created.apiKey,
            apiSecret: created.apiSecret,
          },
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new InternalServerErrorException(
      'Failed to generate a unique API key.',
    );
  }

  async revokeApiKey(clientId: string, apiKeyId: string) {
    const updated = await this.adminRepository.revokeApiKey(clientId, apiKeyId);
    this.invalidateDashboardCache(clientId);
    return { item: AdminMapper.apiKey(updated) };
  }

  async listReceivingAccounts(clientId: string) {
    const client = await this.adminRepository.findClientOrThrow(clientId);
    const accounts = await this.adminRepository.listReceivingAccounts(clientId);

    return {
      client: AdminMapper.client(client),
      total: accounts.length,
      items: accounts.map((item) => AdminMapper.receivingAccount(item)),
    };
  }

  async createReceivingAccount(
    clientId: string,
    dto: CreateReceivingAccountDto,
  ) {
    await this.adminRepository.findClientOrThrow(clientId);
    console.log(dto.paymentMethod);
    try {
      const created = await this.adminRepository.createReceivingAccount({
        clientId,
        paymentMethod: dto.paymentMethod,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        isActive: dto.isActive,
      });

      this.invalidateDashboardCache(clientId);
      return { item: AdminMapper.receivingAccount(created) };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A receiving account for this payment method already exists for the client.',
        );
      }

      throw error;
    }
  }

  async updateReceivingAccount(
    clientId: string,
    accountId: string,
    dto: UpdateReceivingAccountDto,
  ) {
    try {
      const updated = await this.adminRepository.updateReceivingAccount(
        clientId,
        accountId,
        dto,
      );

      this.invalidateDashboardCache(clientId);
      return { item: AdminMapper.receivingAccount(updated) };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Another receiving account already uses this payment method for the client.',
        );
      }

      throw error;
    }
  }

  async deleteReceivingAccount(clientId: string, accountId: string) {
    const deleted = await this.adminRepository.deleteReceivingAccount(
      clientId,
      accountId,
    );
    this.invalidateDashboardCache(clientId);
    return { item: AdminMapper.receivingAccount(deleted) };
  }

  async listCheckouts(clientId: string, query: CheckoutListQueryDto) {
    await this.adminRepository.findClientOrThrow(clientId);
    const page = query.page ?? 0;
    const pageSize = query.pageSize ?? 20;
    const { items, total } = await this.adminRepository.listCheckouts(
      clientId,
      {
        page,
        pageSize,
        status: query.status,
        invoiceId: query.invoiceId,
        checkoutId: query.checkoutId,
        from: query.from,
        to: query.to,
      },
    );

    return this.buildPaginatedResponse(
      items.map((item) => AdminMapper.checkout(item)),
      total,
      { page, pageSize },
    );
  }

  async getCheckoutDetail(clientId: string, checkoutId: string) {
    const checkout = await this.adminRepository.getCheckoutDetail(
      clientId,
      checkoutId,
    );

    return {
      item: {
        ...AdminMapper.checkout(checkout),
        deposit: checkout.depositRequest
          ? AdminMapper.deposit({
              ...checkout.depositRequest,
              user: checkout.depositRequest.user,
              checkout,
              receipt: checkout.depositRequest.receipt,
              crawlResult: checkout.depositRequest.crawlResult,
              verifications: checkout.depositRequest.verifications,
              transaction: checkout.depositRequest.transaction,
            })
          : null,
      },
    };
  }

  async listDeposits(clientId: string, query: DepositListQueryDto) {
    await this.adminRepository.findClientOrThrow(clientId);
    const page = query.page ?? 0;
    const pageSize = query.pageSize ?? 20;
    const { items, total } = await this.adminRepository.listDeposits(clientId, {
      page,
      pageSize,
      status: query.status,
      paymentMethod: query.paymentMethod,
      checkoutId: query.checkoutId,
      userId: query.userId,
      from: query.from,
      to: query.to,
    });

    return this.buildPaginatedResponse(
      items.map((item) => AdminMapper.deposit(item)),
      total,
      { page, pageSize },
    );
  }

  async getDepositDetail(clientId: string, depositId: string) {
    const deposit = await this.adminRepository.getDepositDetail(
      clientId,
      depositId,
    );
    return { item: AdminMapper.deposit(deposit) };
  }

  async listTransactions(clientId: string, query: TransactionListQueryDto) {
    await this.adminRepository.findClientOrThrow(clientId);
    const page = query.page ?? 0;
    const pageSize = query.pageSize ?? 20;
    const { items, total } = await this.adminRepository.listTransactions(
      clientId,
      {
        page,
        pageSize,
        depositRequestId: query.depositRequestId,
        platformUserId: query.platformUserId,
        from: query.from,
        to: query.to,
      },
    );

    return this.buildPaginatedResponse(
      items.map((item) => AdminMapper.transaction(item)),
      total,
      { page, pageSize },
    );
  }

  async getTransactionDetail(clientId: string, transactionId: string) {
    const transaction = await this.adminRepository.getTransactionDetail(
      clientId,
      transactionId,
    );
    return { item: AdminMapper.transaction(transaction) };
  }

  private buildPaginatedResponse(
    items: unknown[],
    total: number,
    pagination: PaginationQueryDto,
  ) {
    return {
      total,
      page: pagination.page ?? 0,
      pageSize: pagination.pageSize ?? 20,
      hasMore:
        ((pagination.page ?? 0) + 1) * (pagination.pageSize ?? 20) < total,
      items,
    };
  }

  private getDashboardCacheKey(clientId: string) {
    return `admin-dashboard:${clientId}`;
  }

  private invalidateDashboardCache(clientId: string) {
    this.cache.delete(this.getDashboardCacheKey(clientId));
  }
}
