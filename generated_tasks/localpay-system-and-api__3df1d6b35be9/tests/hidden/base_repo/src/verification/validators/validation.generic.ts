import { PaymentMethod, VerificationMethod } from 'src/common/types/bot-enum';
import { LinkParserService } from '../link-praser/link-praser.service';
import { OcrService } from '../ocr/ocr.service';
import { SmsParserService } from '../sms-parser/sms-parser.service';
import { CbeParser } from '../common/parsers/cbe.parser';
import { TelebirrParser } from '../common/parsers/telebirr.parser';
import { EBirrParser } from '../common/parsers/ebirr.parser';
import { AbyssiniaParser } from '../common/parsers/abyssinia.parser';
import { NibParser } from '../common/parsers/nib.parser';
import { Injectable } from '@nestjs/common';
import {
  ExtractionError,
  ParseError,
  UnsupportedMethodError,
} from '../Verification.errors ';

@Injectable()
export class GenericValidation {
  constructor(
    private readonly ocrService: OcrService,
    private readonly smsService: SmsParserService,
    private readonly linkService: LinkParserService,
  ) {}

  // ── Public entry point ────────────────────────────────────────────────────
  //
  // Returns a typed success/fail result — never throws.
  // Any error from validateSwitcher() is caught here, converted to
  // ExtractionError if not already typed, and re-thrown so
  // VerificationService can catch it at the service boundary.

  async verify(payload: {
    bank: PaymentMethod;
    amount: number;
    verMethod: VerificationMethod;
    rawProof: string;
    telegramFileId?: string;
    userId: string;
    accountNumber?: string;
  }) {
    let result: Awaited<ReturnType<typeof this.validateSwitcher>>;

    try {
      result = await this.validateSwitcher(payload.bank, payload.verMethod, {
        rawProof: payload.rawProof,
        telegramFileId: payload.telegramFileId,
        accountNumber: payload.accountNumber,
      });
    } catch (err) {
      // Re-throw typed errors as-is — VerificationService handles them

      if (
        err instanceof ParseError ||
        err instanceof UnsupportedMethodError ||
        err instanceof ExtractionError
      ) {
        throw new Error(err.message);
      }

      // Wrap any unknown error from the parsers as an ExtractionError
      throw new ExtractionError(
        payload.bank,
        payload.verMethod,
        'extracting-details',
        err,
      );
    }

    // Parser returned but produced no receipt — treat as soft extraction fail
    if (!result?.receipt) {
      return { status: 'FAIL_HARD' as const, reason: 'Nothing to justify' };
    }

    return { status: 'SUCCESS' as const, receipt: result.receipt };
  }

  // ── Switcher — wraps each parser call individually ────────────────────────
  //
  // Each case is wrapped in its own try/catch so we know exactly which
  // service threw. All errors are converted to ParseError with full context
  // (bank, method, stage) before propagating up.

  async validateSwitcher(
    bank: PaymentMethod,
    method: VerificationMethod,
    payload: {
      rawProof?: string;
      telegramFileId?: string;
      accountNumber?: string;
    },
  ) {
    switch (method) {
      case VerificationMethod.LINK: {
        try {
          return await this.linkService.linkPrase(bank, payload.rawProof ?? '');
        } catch (cause) {
          throw new ParseError(
            bank,
            VerificationMethod.LINK,
            'extracting-details',
            cause,
          );
        }
      }

      case VerificationMethod.SCREENSHOT: {
        try {
          return await this.ocrService.recognize(
            bank,
            payload.telegramFileId ?? '',
          );
        } catch (cause) {
          throw new ParseError(
            bank,
            VerificationMethod.SCREENSHOT,
            'extracting-details',
            cause,
          );
        }
      }

      case VerificationMethod.SMS: {
        try {
          return await this.smsService.smsPrase(
            bank,
            payload.rawProof ?? '',
            payload.accountNumber,
          );
        } catch (cause) {
          console.error('❌ SMS PARSE REAL ERROR:', cause); // TEMP
          throw new ParseError(
            bank,
            VerificationMethod.SMS,
            'extracting-details',
            cause,
          );
        }
      }

      default: {
        throw new UnsupportedMethodError(method, 'extracting-details');
      }
    }
  }
}
