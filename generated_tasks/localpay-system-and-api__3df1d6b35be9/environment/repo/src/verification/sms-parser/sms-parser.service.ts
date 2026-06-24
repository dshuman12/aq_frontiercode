import { Injectable } from '@nestjs/common';
import { CbeParser } from '../common/parsers/cbe.parser';
import { TelebirrParser } from '../common/parsers/telebirr.parser';
import { EBirrParser } from '../common/parsers/ebirr.parser';
import { AbyssiniaParser } from '../common/parsers/abyssinia.parser';
import { NibParser } from '../common/parsers/nib.parser';

@Injectable()
export class SmsParserService {
  private readonly parsers = {
    CBE: new CbeParser(),
    TELEBIRR: new TelebirrParser(),
    EBIRR: new EBirrParser(),
    ABYSSINIA: new AbyssiniaParser(),
    NIB: new NibParser(),
  } as const;
  async smsPrase(
    bank: keyof typeof this.parsers,
    sms: string,
    accountNumber?: string,
  ) {
    const extractedLink = this.parsers[bank].extract(sms, accountNumber);
    console.log('link:' + extractedLink.link);
    const rawText = await this.parsers[bank].fetch(extractedLink.link);
    const parsed = await this.parsers[bank].receiptParser(rawText.page);
    console.log('parsed', parsed);
    return {
      bank,
      receipt: parsed,
    };
  }
}
