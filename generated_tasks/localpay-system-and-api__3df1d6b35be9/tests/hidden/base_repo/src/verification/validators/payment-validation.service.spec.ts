import { BadRequestException } from '@nestjs/common';
import { PaymentValidationService } from './PaymentValidationService';
import { VerificationMethod } from 'src/common/types/bot-enum';

describe('PaymentValidationService', () => {
  let service: PaymentValidationService;
  const linkService = { linkPrase: jest.fn() };
  const ocrService = { recognize: jest.fn() };
  const smsService = { smsPrase: jest.fn() };

  beforeEach(() => {
    service = new PaymentValidationService(
      ocrService as any,
      smsService as any,
      linkService as any,
    );
    linkService.linkPrase.mockReset();
    ocrService.recognize.mockReset();
    smsService.smsPrase.mockReset();
  });

  it('routes LINK verification to the link parser', async () => {
    linkService.linkPrase.mockResolvedValue({
      bank: 'CBE',
      receipt: {},
    } as any);

    await service.validate('CBE', VerificationMethod.LINK, {
      rawProof: 'http://example.com',
    });

    expect(linkService.linkPrase).toHaveBeenCalledWith(
      'CBE',
      'http://example.com',
    );
  });

  it('throws when the verification method is unsupported', async () => {
    await expect(
      service.validate('CBE', 'UNKNOWN' as VerificationMethod, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
