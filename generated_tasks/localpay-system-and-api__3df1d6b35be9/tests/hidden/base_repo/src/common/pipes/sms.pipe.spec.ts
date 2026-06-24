import { PaymentMethod } from '@prisma/client';
import { VerificationMethod } from 'src/common/types/bot-enum';
import { SmsPreValidatorService } from './sms.pipe';

describe('SmsPreValidatorService', () => {
  const service = new SmsPreValidatorService();

  it('passes for non-SMS verification methods', () => {
    const result = service.validate(
      'short',
      PaymentMethod.CBE,
      VerificationMethod.LINK,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects too-short SMS', () => {
    const result = service.validate(
      'short text',
      PaymentMethod.CBE,
      VerificationMethod.SMS,
    );
    expect(result.valid).toBe(false);
  });

  it('rejects SMS that matches forbidden patterns for selected bank', () => {
    const telebirrLike =
      'Dear x You have transferred ETB 50.00 ... thank you for using telebirr Ethio telecom https://transactioninfo.ethiotelecom.et/receipt/DCK82EGB8C';
    const result = service.validate(
      telebirrLike,
      PaymentMethod.CBE,
      VerificationMethod.SMS,
    );
    expect(result.valid).toBe(false);
  });

  it('accepts valid telebirr SMS sample', () => {
    const sample =
      'Dear Ephrem You have transferred ETB 50.00 to CHALTU HIRPHASA (2519****7857) on 20/03/2026 20:59:48. Your transaction number is DCK82EGB8C. Your current E-Money Account balance is ETB 0.00. https://transactioninfo.ethiotelecom.et/receipt/DCK82EGB8C Thank you for using telebirr Ethio telecom';
    const result = service.validate(
      sample,
      PaymentMethod.TELEBIRR,
      VerificationMethod.SMS,
    );
    expect(result).toEqual({ valid: true });
  });
});
