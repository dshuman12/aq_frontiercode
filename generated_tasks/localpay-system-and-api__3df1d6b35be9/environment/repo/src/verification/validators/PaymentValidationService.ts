import { VerificationMethod } from 'src/common/types/bot-enum';
import { LinkParserService } from '../link-praser/link-praser.service';
import { OcrService } from '../ocr/ocr.service';
import { SmsParserService } from '../sms-parser/sms-parser.service';
import { CbeParser } from '../common/parsers/cbe.parser';
import { TelebirrParser } from '../common/parsers/telebirr.parser';
import { EBirrParser } from '../common/parsers/ebirr.parser';
import { AbyssiniaParser } from '../common/parsers/abyssinia.parser';
import { NibParser } from '../common/parsers/nib.parser';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class PaymentValidationService {
  constructor(
    private readonly ocrService: OcrService,
    private readonly smsService: SmsParserService,
    private readonly linkService: LinkParserService,
  ) {}
  private readonly parsers = {
    CBE: new CbeParser(),
    TELEBIRR: new TelebirrParser(),
    EBIRR: new EBirrParser(),
    ABYSSINIA: new AbyssiniaParser(),
    NIB: new NibParser(),
  } as const;
  async validate(
    bankName: keyof typeof this.parsers,
    method: VerificationMethod,
    payload: { rawProof?: string; telegramFileId?: string },
  ) {
    switch (method) {
      case 'LINK':
        const { bank: linkBank, receipt: linkReceipt } =
          await this.linkService.linkPrase(bankName, payload.rawProof ?? '');
        console.log(linkReceipt);
        break;
      case 'SCREENSHOT':
        const { bank: photoBank, receipt: photoReceipt } =
          await this.ocrService.recognize(
            bankName,
            payload.telegramFileId ?? '',
          );
        console.log(photoReceipt);
        break;
      case 'SMS':
        const { bank: smsBank, receipt: smsReceipt } =
          await this.smsService.smsPrase(bankName, payload.rawProof ?? '');
        console.log(smsReceipt);
        break;
      default:
        throw new BadRequestException('Unsupported verification method');
    }
  }
}
