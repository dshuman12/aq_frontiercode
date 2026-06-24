import { BadRequestException } from '@nestjs/common';
import { DepositWebService } from './deposit.web.service';

describe('DepositWebService', () => {
  // -------------------------
  // Mocks
  // -------------------------
  const verifyService = {
    verify: jest.fn(),
  };

  const smsPreValidator = {
    validate: jest.fn(),
  };

  const gatewayService = {
    verifyCheckout: jest.fn(),
    getCheckoutContext: jest.fn(),
  };

  let service: DepositWebService;

  const user = { userId: 'u1', email: 'u@test.com' } as any;

  const baseDto = {
    amount: 10,
    paymentMethod: 'CBE',
    verificationMethod: 'SMS',
    rawProof: 'https://apps.cbe.com.et:100/?id=FT260876DYXB80798622',
    accountNumber: '123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    verifyService.verify.mockReset();
    smsPreValidator.validate.mockReset();
    gatewayService.verifyCheckout.mockReset();
    gatewayService.getCheckoutContext.mockReset();

    service = new DepositWebService(
      verifyService as any,
      smsPreValidator as any,
      gatewayService as any,
    );

    smsPreValidator.validate.mockReturnValue({ valid: true });
  });

  // -------------------------
  // PRE-VALIDATION
  // -------------------------
  it('should reject invalid SMS pre-validation', async () => {
    // Arrange
    smsPreValidator.validate.mockReturnValue({
      valid: false,
      reason: 'bad sms',
    });

    // Act & Assert
    await expect(
      service.submitSingleDeposit(baseDto as any, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should call verification when pre-validation passes', async () => {
    // Arrange
    verifyService.verify.mockResolvedValue({
      status: 'PASS',
      transactionId: 'tx',
      depositRequestId: 'dep-1',
    });

    // Act
    await service.submitSingleDeposit(baseDto as any, user);

    // Assert
    expect(verifyService.verify).toHaveBeenCalled();
  });

  // -------------------------
  // SUCCESS CASES
  // -------------------------
  it('should return PASS without checkoutId', async () => {
    // Arrange
    verifyService.verify.mockResolvedValue({
      status: 'PASS',
      transactionId: 'tx',
      depositRequestId: 'dep-1',
    });

    // Act
    const res = await service.submitSingleDeposit(baseDto as any, user);

    // Assert
    expect(gatewayService.verifyCheckout).not.toHaveBeenCalled();
    expect(res.status).toBe('PASS');
  });

  it('should verify checkout when PASS and checkoutId exists', async () => {
    // Arrange
    verifyService.verify.mockResolvedValue({
      status: 'PASS',
      transactionId: 'tx',
      depositRequestId: 'dep-1',
    });

    gatewayService.verifyCheckout.mockResolvedValue({
      successUrl: 'https://client.app/success',
    });
    gatewayService.getCheckoutContext.mockResolvedValue({
      checkoutId: 'chk_1',
      clientId: 'client-1',
      status: 'PENDING',
      receivingAccountNumber: '99887766',
    });

    const dto = { ...baseDto, checkoutId: 'chk_1' };

    // Act
    const res = await service.submitSingleDeposit(dto as any, user);

    // Assert
    expect(gatewayService.verifyCheckout).toHaveBeenCalledWith('chk_1', {
      transactionId: 'tx',
      amount: 10,
      email: user.email,
      depositId: 'dep-1',
    });

    expect(res).toEqual({
      status: 'PASS',
      depositRequestId: 'dep-1',
      successUrl: 'https://client.app/success',
      transactionId: 'tx',
    });
  });

  // -------------------------
  // FAILURE CASES
  // -------------------------
  it('should return FAIL_HARD when verification fails', async () => {
    // Arrange
    verifyService.verify.mockResolvedValue({
      status: 'FAIL_HARD',
      reason: 'duplicate',
      depositRequestId: 'dep-1',
    });

    // Act
    const res = await service.submitSingleDeposit(baseDto as any, user);

    // Assert
    expect(res.status).toBe('FAIL_HARD');
    expect(gatewayService.verifyCheckout).not.toHaveBeenCalled();
  });

  // -------------------------
  // ERROR HANDLING
  // -------------------------
  it('should throw if verification service fails', async () => {
    // Arrange
    verifyService.verify.mockRejectedValue(new Error('verification failed'));

    // Act & Assert
    await expect(
      service.submitSingleDeposit(baseDto as any, user),
    ).rejects.toThrow('verification failed');
  });

  it('should throw if gateway verification fails', async () => {
    // Arrange
    verifyService.verify.mockResolvedValue({
      status: 'PASS',
      transactionId: 'tx',
      depositRequestId: 'dep-1',
    });

    gatewayService.verifyCheckout.mockRejectedValue(new Error('gateway fail'));
    gatewayService.getCheckoutContext.mockResolvedValue({
      checkoutId: 'chk_1',
      clientId: 'client-1',
      status: 'PENDING',
      receivingAccountNumber: '99887766',
    });

    const dto = { ...baseDto, checkoutId: 'chk_1' };

    // Act & Assert
    await expect(service.submitSingleDeposit(dto as any, user)).rejects.toThrow(
      'gateway fail',
    );
  });

  it('should throw if verification result is invalid', async () => {
    // Arrange
    verifyService.verify.mockResolvedValue(null);

    // Act & Assert
    await expect(
      service.submitSingleDeposit(baseDto as any, user),
    ).rejects.toThrow();
  });

  // -------------------------
  // EDGE CASES
  // -------------------------
  it('should skip SMS pre-validation for LINK method', async () => {
    // Arrange
    verifyService.verify.mockResolvedValue({
      status: 'PASS',
      transactionId: 'tx',
      depositRequestId: 'dep-1',
    });

    const dto = {
      ...baseDto,
      verificationMethod: 'LINK',
    };

    // Act
    await service.submitSingleDeposit(dto as any, user);

    // Assert
    expect(smsPreValidator.validate).not.toHaveBeenCalled();
  });

  it('should call verify with correct payload', async () => {
    // Arrange
    verifyService.verify.mockResolvedValue({
      status: 'PASS',
      transactionId: 'tx',
      depositRequestId: 'dep-1',
    });

    // Act
    await service.submitSingleDeposit(baseDto as any, user);

    // Assert
    expect(verifyService.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10,
        paymentMethod: 'CBE',
      }),
    );
  });

  it('should include checkout client context in verify payload', async () => {
    verifyService.verify.mockResolvedValue({
      status: 'PASS',
      transactionId: 'tx',
      depositRequestId: 'dep-1',
    });
    gatewayService.verifyCheckout.mockResolvedValue({
      successUrl: 'https://client.app/success',
    });
    gatewayService.getCheckoutContext.mockResolvedValue({
      checkoutId: 'chk_1',
      clientId: 'client-1',
      status: 'PENDING',
      receivingAccountNumber: '99887766',
    });

    await service.submitSingleDeposit(
      { ...baseDto, checkoutId: 'chk_1' } as any,
      user,
    );

    expect(verifyService.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        checkoutId: 'chk_1',
        accountNumber: '99887766',
      }),
    );
  });
});
