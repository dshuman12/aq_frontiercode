import { Injectable } from '@nestjs/common';
import { CbeParser } from '../common/parsers/cbe.parser';
import { TelebirrParser } from '../common/parsers/telebirr.parser';
import { EBirrParser } from '../common/parsers/ebirr.parser';
import { AbyssiniaParser } from '../common/parsers/abyssinia.parser';
import { NibParser } from '../common/parsers/nib.parser';

@Injectable()
export class LinkParserService {
  private readonly parsers = {
    CBE: new CbeParser(),
    TELEBIRR: new TelebirrParser(),
    EBIRR: new EBirrParser(),
    ABYSSINIA: new AbyssiniaParser(),
    NIB: new NibParser(),
  } as const;
  async linkPrase(bank: keyof typeof this.parsers, link: string) {
    const rawText = await this.parsers[bank].fetch(link);
    const parsed = await this.parsers[bank].receiptParser(rawText.page);
    console.log('parsed', parsed);
    return {
      bank,
      receipt: parsed,
    };
  }
}
