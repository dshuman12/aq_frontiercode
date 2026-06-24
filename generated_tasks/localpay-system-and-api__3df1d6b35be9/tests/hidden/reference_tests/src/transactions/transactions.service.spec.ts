import { DepositTransactionRepository } from './transactions.service';

describe('DepositTransactionRepository', () => {
  const prisma = {
    adminConfig: { findFirst: jest.fn() },
    depositRequest: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    receipt: { create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    crawlResult: { create: jest.fn(), upsert: jest.fn() },
    verification: { create: jest.fn(), upsert: jest.fn() },
    transaction: { create: jest.fn() },
  };
  const repo = new DepositTransactionRepository(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createDepositRequest writes expected fields', async () => {
    prisma.depositRequest.create.mockResolvedValue({ id: 'dep-1' });

    await repo.createDepositRequest({
      userId: 'u1',
      clientId: 'client-1',
      checkoutId: 'chk-1',
      amount: 100,
      paymentMethod: 'CBE' as any,
      status: 'VERIFYING' as any,
      maxRetries: 3,
    });

    expect(prisma.depositRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'client-1',
          checkoutId: 'chk-1',
        }),
      }),
    );
  });

  it('setDepositResult maps PASS to VERIFIED', async () => {
    await repo.setDepositResult('dep-1', {
      status: 'PASS',
      transactionId: 't',
      depositRequestId: 'dep-1',
    });

    expect(prisma.depositRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'VERIFIED',
          rejectionReason: null,
        }),
      }),
    );
  });

  it('setDepositResult stores rejection reason for failures', async () => {
    await repo.setDepositResult('dep-2', {
      status: 'FAIL_HARD',
      reason: 'duplicate',
      depositRequestId: 'dep-2',
    });

    expect(prisma.depositRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED_HARD',
          rejectionReason: 'duplicate',
        }),
      }),
    );
  });

  it('createCrawlResult maps responseType by method', async () => {
    await repo.createCrawlResult({
      depositRequestId: 'dep-1',
      transactionId: 'tx',
      paymentMethod: 'CBE' as any,
      verMethod: 'SMS' as any,
      confirmedAmount: 10,
      confirmedReceiverAccount: '1234',
      confirmedReceiverName: 'Name',
      confirmedTimestamp: new Date(),
    });

    expect(prisma.crawlResult.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          depositRequestId: 'dep-1',
        },
        create: expect.objectContaining({
          responseType: 'JSON',
        }),
        update: expect.objectContaining({
          responseType: 'JSON',
        }),
      }),
    );
  });
});
