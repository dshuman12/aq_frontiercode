jest.mock('./validators/validation.generic', () => ({
  GenericValidation: class {},
}));

import { VerificationCheck } from '@prisma/client';
import { VerificationService } from './verification.service';

describe('VerificationService', () => {
  const generic = { verify: jest.fn() };
  const repo = {
    getMaxRetries: jest.fn(),
    createDepositRequest: jest.fn(),
    createReceipt: jest.fn(),
    setDepositStatus: jest.fn(),
    createCrawlResult: jest.fn(),
    setReceiptTransactionId: jest.fn(),
    createVerificationCheck: jest.fn(),
    setDepositResult: jest.fn(),
  };
  const duplicatePipe = { run: jest.fn() };
  const amountPipe = { run: jest.fn() };
  const receiverPipe = { run: jest.fn() };
  const timestampPipe = { run: jest.fn() };

  const service = new VerificationService(
    generic as any,
    repo as any,
    duplicatePipe as any,
    amountPipe as any,
    receiverPipe as any,
    timestampPipe as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repo.getMaxRetries.mockResolvedValue(3);
    repo.createDepositRequest.mockResolvedValue({
      id: 'dep-1',
      amount: 100,
      paymentMethod: 'CBE',
    });
    repo.createReceipt.mockResolvedValue({});
    repo.setDepositStatus.mockResolvedValue({});
    repo.createCrawlResult.mockResolvedValue({
      id: 'cr-1',
      transactionId: 'tx-1',
      confirmedAmount: 100,
    });
    repo.setReceiptTransactionId.mockResolvedValue({});
    repo.createVerificationCheck.mockResolvedValue({});
    repo.setDepositResult.mockResolvedValue({});
    duplicatePipe.run.mockResolvedValue({ pass: true });
    amountPipe.run.mockResolvedValue({ pass: true });
    receiverPipe.run.mockResolvedValue({ pass: true });
    timestampPipe.run.mockResolvedValue({ pass: true });
    generic.verify.mockResolvedValue({
      status: 'SUCCESS',
      receipt: {
        receipt: {
          transactionNumber: 'tx-1',
          amount: '100',
          receiverAccount: '1234',
          receiverName: 'Receiver',
          date: '3/11/2026, 6:15:00 PM',
        },
      },
    });
  });

  const payload = {
    email: 'u@test.com',
    amount: 100,
    paymentMethod: 'CBE' as any,
    verMethod: 'SMS' as any,
    rawProof: 'proof',
    telegramFileId: null,
    userId: 'u1',
    accountNumber: '12345678',
  };

  it('verify succeeds and returns PASS', async () => {
    const res = await service.verify(payload as any);

    expect(res.status).toBe('PASS');
    expect(repo.createDepositRequest).toHaveBeenCalled();
    expect(repo.createCrawlResult).toHaveBeenCalled();
    expect(repo.setDepositResult).toHaveBeenCalled();
  });

  it('verify returns FAIL_HARD for duplicate failure', async () => {
    duplicatePipe.run.mockResolvedValue({
      pass: false,
      reasonCode: 'DUPLICATE_TRANSACTION',
      detail: 'duplicate',
    });

    const res = await service.verify(payload as any);
    expect(res.status).toBe('FAIL_HARD');
  });

  it('verify returns FAIL_RETRYABLE for amount mismatch', async () => {
    amountPipe.run.mockResolvedValue({
      pass: false,
      reasonCode: 'AMOUNT_MISMATCH',
      detail: 'amount mismatch',
    });

    const res = await service.verify(payload as any);
    expect(res.status).toBe('FAIL_RETRYABLE');
  });

  it('verify returns FAIL_HARD for receiver mismatch', async () => {
    receiverPipe.run.mockResolvedValue({
      pass: false,
      reasonCode: 'RECEIVER_ACCOUNT_MISMATCH',
      detail: 'receiver mismatch',
    });

    const res = await service.verify(payload as any);
    expect(res.status).toBe('FAIL_HARD');
  });

  it('verify returns FAIL_RETRYABLE for timestamp expired', async () => {
    timestampPipe.run.mockResolvedValue({
      pass: false,
      reasonCode: 'TIMESTAMP_EXPIRED',
      detail: 'old',
    });

    const res = await service.verify(payload as any);
    expect(res.status).toBe('FAIL_RETRYABLE');
  });

  it('extractFromProof rejects invalid extracted receipt fields', async () => {
    generic.verify.mockResolvedValue({
      status: 'SUCCESS',
      receipt: {
        receipt: {
          transactionNumber: '',
          amount: '100',
          receiverAccount: '1234',
          receiverName: 'Receiver',
          date: '3/11/2026, 6:15:00 PM',
        },
      },
    });

    await expect(
      (service as any).extractFromProof(payload, 'dep-1', 'dep-1', undefined),
    ).rejects.toThrow('Failed to extract the expected data');
  });

  it('verify throws when extraction fails before pipeline', async () => {
    generic.verify.mockRejectedValue(new Error('parser down'));

    await expect(service.verify(payload as any)).rejects.toThrow(
      'Failed to get any response form Your Proof',
    );
    expect(repo.createCrawlResult).not.toHaveBeenCalled();
  });

  it('extractBulkReceipt returns user message when generic verify fails', async () => {
    generic.verify.mockRejectedValue(new Error('network'));

    const res = await service.extractBulkReceipt({
      paymentMethod: 'CBE' as any,
      verMethod: 'SMS' as any,
      rawProof: 'proof',
      telegramFileId: null,
      amount: 10,
      userId: 'u1',
    });

    expect('userMessage' in res).toBe(true);
  });

  it('verifyBulk fail-fast returns first failing index', async () => {
    repo.createDepositRequest
      .mockResolvedValueOnce({ id: 'd1', amount: 10, paymentMethod: 'CBE' })
      .mockResolvedValueOnce({ id: 'd2', amount: 20, paymentMethod: 'CBE' });
    repo.createCrawlResult
      .mockResolvedValueOnce({ id: 'c1', transactionId: 't1' })
      .mockResolvedValueOnce({ id: 'c2', transactionId: 't2' });
    duplicatePipe.run
      .mockResolvedValueOnce({ pass: true })
      .mockResolvedValueOnce({
        pass: false,
        reasonCode: 'DUPLICATE_TRANSACTION',
        detail: 'dup',
      });

    const res = await service.verifyBulk({
      userId: 'u1',
      paymentMethod: 'CBE' as any,
      verMethod: 'SMS' as any,
      receipts: [
        {
          amount: 10,
          date: new Date().toISOString(),
          bankName: 'CBE',
          transactionId: 't1',
          receiverAccount: '1',
          receiverName: 'A',
          rawProof: 'p1',
          telegramFileId: null,
        },
        {
          amount: 20,
          date: new Date().toISOString(),
          bankName: 'CBE',
          transactionId: 't2',
          receiverAccount: '2',
          receiverName: 'B',
          rawProof: 'p2',
          telegramFileId: null,
        },
      ],
    });

    expect(res.status).toBe('FAIL');
    if (res.status === 'FAIL') {
      expect(res.failedIndex).toBe(2);
    }
  });
});
