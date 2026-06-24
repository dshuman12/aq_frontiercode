import { ReceiverAccountMatchesPipe } from './receiver-account-matches.pipe';

describe('ReceiverAccountMatchesPipe', () => {
  const prisma = {
    clientReceivingAccount: {
      findUnique: jest.fn(),
    },
    receivingAccount: {
      findUnique: jest.fn(),
    },
  };
  const pipe = new ReceiverAccountMatchesPipe(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails when receiver account is unreadable', async () => {
    const result = await pipe.run(
      { confirmedReceiverAccount: null } as any,
      { paymentMethod: 'CBE' } as any,
    );

    expect(result.pass).toBe(false);
    expect(result.reasonCode).toBe('RECEIVER_UNREADABLE');
  });

  it('fails when no receiving account config exists', async () => {
    prisma.receivingAccount.findUnique.mockResolvedValue(null);

    const result = await pipe.run(
      { confirmedReceiverAccount: '1234' } as any,
      { paymentMethod: 'CBE' } as any,
    );

    expect(result.pass).toBe(false);
    expect(result.reasonCode).toBe('NO_RECEIVING_ACCOUNT_CONFIGURED');
  });

  it('fails when account digits mismatch', async () => {
    prisma.receivingAccount.findUnique.mockResolvedValue({
      accountNumber: '00009999',
      accountName: 'Receiver Name',
    });

    const result = await pipe.run(
      {
        confirmedReceiverAccount: '00001111',
        confirmedReceiverName: 'Receiver Name',
      } as any,
      { paymentMethod: 'CBE' } as any,
    );

    expect(result.pass).toBe(false);
    expect(result.reasonCode).toBe('RECEIVER_ACCOUNT_MISMATCH');
  });

  it('fails when account matches but name mismatches', async () => {
    prisma.receivingAccount.findUnique.mockResolvedValue({
      accountNumber: '00009999',
      accountName: 'RIGHT NAME',
    });

    const result = await pipe.run(
      {
        confirmedReceiverAccount: '11119999',
        confirmedReceiverName: 'WRONG NAME',
      } as any,
      { paymentMethod: 'CBE' } as any,
    );

    expect(result.pass).toBe(false);
    expect(result.reasonCode).toBe('RECEIVER_NAME_MISMATCH');
  });

  it('passes when account tail and normalized name match', async () => {
    prisma.receivingAccount.findUnique.mockResolvedValue({
      accountNumber: '00009999',
      accountName: 'Receiver Name',
    });

    const result = await pipe.run(
      {
        confirmedReceiverAccount: '1111 9999',
        confirmedReceiverName: 'receiver   name',
      } as any,
      { paymentMethod: 'CBE' } as any,
    );

    expect(result).toEqual({ pass: true });
  });

  it('uses client receiving account when deposit belongs to a client', async () => {
    prisma.clientReceivingAccount.findUnique.mockResolvedValue({
      accountNumber: '12349999',
      accountName: 'Client Receiver',
    });

    const result = await pipe.run(
      {
        confirmedReceiverAccount: '8888 9999',
        confirmedReceiverName: 'client receiver',
      } as any,
      { paymentMethod: 'CBE', clientId: 'client-1' } as any,
    );

    expect(prisma.clientReceivingAccount.findUnique).toHaveBeenCalledWith({
      where: {
        clientId_paymentMethod: {
          clientId: 'client-1',
          paymentMethod: 'CBE',
        },
      },
    });
    expect(result).toEqual({ pass: true });
  });
});
