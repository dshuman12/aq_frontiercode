import { DuplicateTransactionPipe } from './duplicate-transaction.pipe';

describe('DuplicateTransactionPipe', () => {
  const prisma = {
    crawlResult: {
      findMany: jest.fn(),
    },
  };

  const pipe = new DuplicateTransactionPipe(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes when no blocked duplicate exists', async () => {
    prisma.crawlResult.findMany.mockResolvedValue([
      { depositRequest: { status: 'REJECTED_HARD' } },
    ]);

    const result = await pipe.run({ transactionId: 'TX1' } as any, 'dep-1');

    expect(result).toEqual({ pass: true });
  });

  it('fails when a duplicate exists in blocked statuses', async () => {
    prisma.crawlResult.findMany.mockResolvedValue([
      { depositRequest: { status: 'FUNDED' } },
    ]);

    const result = await pipe.run({ transactionId: 'TX2' } as any, 'dep-2');

    expect(result.pass).toBe(false);
    expect(result.reasonCode).toBe('DUPLICATE_TRANSACTION');
  });
});
