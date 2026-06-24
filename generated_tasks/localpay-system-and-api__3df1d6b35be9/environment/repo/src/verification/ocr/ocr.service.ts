import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import axios from 'axios';
import Tesseract from 'tesseract.js';

import { AbyssiniaParser } from '../common/parsers/abyssinia.parser';
import { CbeParser } from '../common/parsers/cbe.parser';
import { EBirrParser } from '../common/parsers/ebirr.parser';
import { NibParser } from '../common/parsers/nib.parser';
import { TelebirrParser } from '../common/parsers/telebirr.parser';

@Injectable()
export class OcrService {
  private readonly parsers = {
    CBE: new CbeParser(),
    TELEBIRR: new TelebirrParser(),
    EBIRR: new EBirrParser(),
    ABYSSINIA: new AbyssiniaParser(),
    NIB: new NibParser(),
  } as const;

  async recognize(bank: keyof typeof this.parsers, imageUrl: string) {
    if (!this.parsers[bank]) {
      throw new BadRequestException(`Unsupported bank: ${bank}`);
    }
    const text = await this.extractTextFromImage(imageUrl);
    console.log('raw text' + text + '\n');
    const extractedLink = this.parsers[bank].extract(text);
    console.log('link:' + extractedLink.link);
    const rawText = await this.parsers[bank].fetch(extractedLink.link);
    //pass the raw text to be prased
    const parsed = await this.parsers[bank].receiptParser(rawText.page);
    console.log('parsed', parsed);
    return {
      bank,
      receipt: parsed,
    };
  }

  private async extractTextFromImage(imageUrl: string): Promise<string> {
    const original = await this.downloadImage(imageUrl);

    const [buffer1, buffer2] = await Promise.all([
      sharp(original)
        .resize({ width: 1500 })
        .grayscale()
        .normalize()
        .toBuffer(),
      sharp(original)
        .resize({ width: 1500 })
        .modulate({ saturation: 2 })
        .normalize()
        .toBuffer(),
    ]);

    const [res1, res2] = await Promise.all([
      Tesseract.recognize(buffer1, 'eng'),
      Tesseract.recognize(buffer2, 'eng'),
    ]);

    // Pick the result with higher average word confidence
    const conf = (r: Tesseract.RecognizeResult) => r.data.confidence ?? 0;

    const best = conf(res1) >= conf(res2) ? res1 : res2;
    return this.sanitizeOCR(best.data.text);
  }

  private sanitizeOCR(text: string): string {
    return (
      text
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[^\x20-\x7E]/g, '')
        // Fix URLs broken by OCR whitespace after ://
        .replace(/https?:\/\/\s+/g, (m) => m.trimEnd())
        // Fix OCR misreading /receipt as Ireceipt or [receipt
        .replace(/\b[Il\[]\s*receipt\//gi, '/receipt/')
        .trim()
    );
  }
  private async downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  }
}
