import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CheckoutStatus } from '@prisma/client';
import { GatewayService } from './gateway.service';

describe('GatewayService', () => {
  const prisma = {
    $transaction: jest.fn(),
    gatewayApiKey: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    gatewayCheckout: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_URL') return 'https://frontend.app';
      if (key === 'GATEWAY_CHECKOUT_EXPIRES_IN_SECONDS') return 1800;
      return undefined;
    }),
  };
  const token = { buildCheckoutToken: jest.fn() };
  const transaction = {
    updateDepositStatus: jest.fn(),
    createTransaction: jest.fn(),
  };
  const cache = {
    delete: jest.fn(),
  };

  const service = new GatewayService(
    prisma as any,
    config as any,
    token as any,
    transaction as any,
    cache as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );
  });

  it('createCheckout rejects invalid API credentials', async () => {
    prisma.gatewayApiKey.findFirst.mockResolvedValue(null);

    await expect(
      service.createCheckout({
        api_key: 'wrong',
        api_secret: 'wrong',
        amount: 50,
        webhook_url: 'https://merchant.app/webhook',
        success_url: 'https://merchant.app/success',
        cancel_url: 'https://merchant.app/cancel',
        failed_url: 'https://merchant.app/failed',
        customer_email: 'u@test.com',
        customer_name: 'User',
        product_name: 'Deposit',
        invoice_id: 'inv-1',
        userId: 'u1',
      } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('createCheckout stores session and returns checkout URL', async () => {
    prisma.gatewayApiKey.findFirst.mockResolvedValue({
      id: 'key-id',
      clientId: 'client-1',
      client: {
        id: 'client-1',
        slug: 'merchant-one',
        name: 'Merchant One',
      },
    });
    prisma.gatewayCheckout.findFirst.mockResolvedValue(null);
    prisma.gatewayCheckout.create.mockResolvedValue({
      id: 'chk_1',
      userId: 'u1',
      customerEmail: 'u@test.com',
      invoiceId: 'inv-1',
      amount: 50,
    });
    token.buildCheckoutToken.mockResolvedValue('token-1');

    const res = await service.createCheckout({
      api_key: 'key_1',
      api_secret: 'sec_1',
      amount: 50,
      webhook_url: 'https://merchant.app/webhook',
      success_url: 'https://merchant.app/success',
      cancel_url: 'https://merchant.app/cancel',
      failed_url: 'https://merchant.app/failed',
      customer_email: 'u@test.com',
      customer_name: 'User',
      product_name: 'Deposit',
      invoice_id: 'inv-1',
      userId: 'u1',
    } as any);

    expect(prisma.gatewayCheckout.create).toHaveBeenCalled();
    expect(prisma.gatewayCheckout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'client-1',
          userId: 'u1',
          expiresAt: expect.any(Date),
        }),
      }),
    );
    expect(token.buildCheckoutToken).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutId: 'chk_1',
        amount: 50,
      }),
    );
    expect(res).toEqual({
      status: 'success',
      checkoutID: 'chk_1',
      checkoutUrl: 'https://frontend.app/deposit/token-1',
      client: {
        id: 'client-1',
        slug: 'merchant-one',
        name: 'Merchant One',
      },
    });
  });

  it('createCheckout rejects reopening a paid invoice', async () => {
    prisma.gatewayApiKey.findFirst.mockResolvedValue({
      id: 'key-id',
      clientId: 'client-1',
      client: {
        id: 'client-1',
        slug: 'merchant-one',
        name: 'Merchant One',
      },
    });
    prisma.gatewayCheckout.findFirst.mockResolvedValue({
      id: 'chk_paid',
      status: CheckoutStatus.PAID,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.createCheckout({
        api_key: 'key_1',
        api_secret: 'sec_1',
        amount: 50,
        webhook_url: 'https://merchant.app/webhook',
        success_url: 'https://merchant.app/success',
        cancel_url: 'https://merchant.app/cancel',
        failed_url: 'https://merchant.app/failed',
        customer_email: 'u@test.com',
        customer_name: 'User',
        product_name: 'Deposit',
        invoice_id: 'inv-1',
        userId: 'u1',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.gatewayCheckout.update).not.toHaveBeenCalled();
  });

  it('createCheckout retries once after a unique constraint race', async () => {
    prisma.gatewayApiKey.findFirst.mockResolvedValue({
      id: 'key-id',
      clientId: 'client-1',
      client: {
        id: 'client-1',
        slug: 'merchant-one',
        name: 'Merchant One',
      },
    });

    const raceError = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });

    prisma.$transaction
      .mockRejectedValueOnce(raceError)
      .mockImplementationOnce(async (callback: any) => callback(prisma));

    prisma.gatewayCheckout.findFirst.mockResolvedValue({
      id: 'chk_existing',
      userId: 'u1',
      customerEmail: 'u@test.com',
      invoiceId: 'inv-1',
      amount: 50,
      status: CheckoutStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
    });
    token.buildCheckoutToken.mockResolvedValue('token-1');

    const res = await service.createCheckout({
      api_key: 'key_1',
      api_secret: 'sec_1',
      amount: 50,
      webhook_url: 'https://merchant.app/webhook',
      success_url: 'https://merchant.app/success',
      cancel_url: 'https://merchant.app/cancel',
      failed_url: 'https://merchant.app/failed',
      customer_email: 'u@test.com',
      customer_name: 'User',
      product_name: 'Deposit',
      invoice_id: 'inv-1',
      userId: 'u1',
    } as any);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.gatewayCheckout.create).not.toHaveBeenCalled();
    expect(res.checkoutID).toBe('chk_existing');
  });

  it('verifyCheckout throws when checkout does not exist', async () => {
    prisma.gatewayCheckout.findUnique.mockResolvedValue(null);

    await expect(
      service.verifyCheckout('missing', {
        transactionId: 't1',
        depositId: 'd1',
        email: 'u@test.com',
        amount: 100,
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('verifyCheckout throws when checkout already paid', async () => {
    prisma.gatewayCheckout.findUnique.mockResolvedValue({
      id: 'chk_1',
      status: 'PAID',
    });

    await expect(
      service.verifyCheckout('chk_1', {
        transactionId: 't1',
        depositId: 'd1',
        email: 'u@test.com',
        amount: 100,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('verifyCheckout marks checkout paid and returns success URL', async () => {
    prisma.gatewayCheckout.findUnique.mockResolvedValue({
      id: 'chk_1',
      status: 'PENDING',
      invoiceId: 'inv-1',
      successUrl: 'https://merchant.app/success',
      userId: 'external-user-1',
      clientId: 'client-1',
    });

    const res = await service.verifyCheckout('chk_1', {
      transactionId: 't1',
      depositId: 'd1',
      email: 'u@test.com',
      amount: 100,
    } as any);

    expect(prisma.gatewayCheckout.update).toHaveBeenCalledWith({
      where: { id: 'chk_1' },
      data: { status: 'PAID', transactionId: 't1' },
    });
    expect(transaction.updateDepositStatus).toHaveBeenCalledWith(
      'd1',
      'FUNDED',
    );
    expect(transaction.createTransaction).toHaveBeenCalledWith(
      'd1',
      'external-user-1',
      100,
      'client-1',
    );
    expect(res).toEqual({ successUrl: 'https://merchant.app/success' });
  });
});
