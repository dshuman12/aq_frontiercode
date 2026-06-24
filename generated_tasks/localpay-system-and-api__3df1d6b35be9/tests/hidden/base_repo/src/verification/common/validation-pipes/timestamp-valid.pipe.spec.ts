import { TimestampValidPipe } from './timestamp-valid.pipe';

describe('TimestampValidPipe', () => {
  const prisma = {
    adminConfig: {
      findFirst: jest.fn(),
    },
  };
  const pipe = new TimestampValidPipe(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.adminConfig.findFirst.mockResolvedValue({ value: '2' });
  });

  it('fails when timestamp is missing', async () => {
    const result = await pipe.run({ confirmedTimestamp: null } as any);
    expect(result.pass).toBe(false);
    expect(result.reasonCode).toBe('TIMESTAMP_UNREADABLE');
  });

  it('fails for future timestamp', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const result = await pipe.run({ confirmedTimestamp: future } as any);
    expect(result.pass).toBe(false);
    expect(result.reasonCode).toBe('TIMESTAMP_FUTURE');
  });

  it('fails for expired timestamp', async () => {
    const old = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const result = await pipe.run({ confirmedTimestamp: old } as any);
    expect(result.pass).toBe(false);
    expect(result.reasonCode).toBe('TIMESTAMP_EXPIRED');
  });

  it('passes for fresh timestamp', async () => {
    const fresh = new Date(Date.now() - 30 * 60 * 1000);
    const result = await pipe.run({ confirmedTimestamp: fresh } as any);
    expect(result).toEqual({ pass: true });
  });
});
