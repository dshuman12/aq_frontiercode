jest.mock(
  'src/auth/email.auth',
  () => ({
    AuthService: class AuthService {},
  }),
  { virtual: true },
);

import { PaymentMethod } from '@prisma/client';
import { VerificationMethod } from 'src/common/types/bot-enum';
import { DepositController } from './deposit.controller';
import { DepositWebService } from './deposit.web.service';

describe('DepositController', () => {
  let controller: DepositController;
  let depositService: jest.Mocked<DepositWebService>;

  const prismaStub = {
    clientReceivingAccount: {
      findMany: jest.fn(),
    },
    gatewayCheckout: {
      findUnique: jest.fn(),
    },
    receivingAccount: {
      findMany: jest.fn(),
    },
  } as const;

  beforeEach(() => {
    depositService = {
      submitSingleDeposit: jest.fn(),
      submitBulkDeposit: jest.fn(),
    } as Partial<
      jest.Mocked<DepositWebService>
    > as jest.Mocked<DepositWebService>;

    controller = new DepositController(depositService, prismaStub as any);
    jest.clearAllMocks();
  });

  it('returns active receiving accounts', async () => {
    prismaStub.clientReceivingAccount.findMany.mockResolvedValue([
      {
        paymentMethod: PaymentMethod.CBE,
        accountNumber: '123',
        accountName: 'Test',
      },
    ] as any);

    const res = await controller.getReceivingAccount('client-1', 'chk-1');
    expect(prismaStub.clientReceivingAccount.findMany).toHaveBeenCalledWith({
      where: { clientId: 'client-1', isActive: true },
    });
    expect(res).toEqual([
      expect.objectContaining({
        paymentMethod: PaymentMethod.CBE,
        accountNumber: '123',
      }),
    ]);
  });

  it('returns client receiving accounts when checkout is provided', async () => {
    prismaStub.clientReceivingAccount.findMany.mockResolvedValue([
      {
        paymentMethod: PaymentMethod.CBE,
        accountNumber: '456',
        accountName: 'Client Test',
      },
    ] as any);

    const res = await controller.getReceivingAccount('client-1', 'chk-1');

    expect(prismaStub.clientReceivingAccount.findMany).toHaveBeenCalledWith({
      where: { clientId: 'client-1', isActive: true },
    });
    expect(res).toEqual([
      expect.objectContaining({
        paymentMethod: PaymentMethod.CBE,
        accountNumber: '456',
      }),
    ]);
  });

  it('returns PASS response from the service result', async () => {
    const dto = {
      amount: 50,
      paymentMethod: PaymentMethod.CBE,
      verificationMethod: VerificationMethod.LINK,
    } as any;

    depositService.submitSingleDeposit.mockResolvedValue({
      status: 'PASS',
      depositRequestId: 'req-1',
      transactionId: 'tx-1',
    });

    const res = await controller.submitSingleDeposit(dto, {
      userId: 'u1',
      email: 'e1',
    });
    expect(res.status).toBe('PASS');
    expect(res.depositRequestId).toBe('req-1');
    expect(res.message).toContain('Deposit verified');
  });

  it('passes through bulk response metadata', async () => {
    const bulkDto = {
      declaredTotal: 100,
      paymentMethod: PaymentMethod.CBE,
      verificationMethod: VerificationMethod.LINK,
      receipts: [{ amount: 100 }],
    } as any;

    const bulkResult = {
      status: 'FAIL',
      failedIndex: 2,
      reason: 'mismatch',
    } as const;

    depositService.submitBulkDeposit.mockResolvedValue(bulkResult as any);

    const res = await controller.submitBulkDeposit(bulkDto, {
      userId: 'u2',
      email: 'e2',
    });
    expect(res.status).toBe('FAIL');
    expect(res.failedIndex).toBe(2);
    expect(res.reason).toBe('mismatch');
  });
});
