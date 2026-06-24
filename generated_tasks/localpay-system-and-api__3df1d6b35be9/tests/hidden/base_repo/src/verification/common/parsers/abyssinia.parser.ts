import { PaymentMethod } from 'src/common/types/bot-enum';
import { ParserAndExtractor } from './parser.interface';
import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';

export class AbyssiniaParser implements ParserAndExtractor {
  private lastRawOcr = '';

  extract(sms: string, accNumber?: string): { link: string } {
    const cleaned = sms.replace(/hitps/gi, 'https').replace(/\s+/g, ' ').trim();
    this.lastRawOcr = cleaned;
    console.log(accNumber);
    // Helper: build the trx link, appending last 5 digits of accNumber if trx is 12 chars
    const buildLink = (trx: string): string => {
      const upper = trx.toUpperCase();
      if (upper.length === 12 && accNumber && accNumber.length >= 5) {
        const last5 = accNumber.slice(-5);
        return `https://cs.bankofabyssinia.com/slip/?trx=${upper}${last5}`;
      }
      return `https://cs.bankofabyssinia.com/slip/?trx=${upper}`;
    };

    // Strategy 1: URL-style from SMS → trx=FT26023J258M
    const urlMatch = cleaned.match(/trx\s*=\s*([A-Z0-9]{8,})/i);
    if (urlMatch) return { link: buildLink(urlMatch[1]) };

    // Strategy 2: OCR → "Transaction [Reference] FT26023J258M"
    const ocrMatch = cleaned.match(
      /Transaction\s+(?:Reference\s+)?([A-Z]{2}\d{5}[A-Z0-9]+)/i,
    );
    if (ocrMatch) return { link: buildLink(ocrMatch[1]) };

    // Strategy 3: bare FT-code anywhere
    const refMatch = cleaned.match(/\b(FT\d{5}[A-Z0-9]{4,})\b/i);
    if (refMatch) return { link: buildLink(refMatch[1]) };

    console.warn(
      '[AbyssiniaParser] Could not extract TRX:',
      cleaned.slice(0, 120),
    );
    return { link: '' };
  }

  async fetch(link: string): Promise<{ page: any }> {
    if (!link) throw new Error('No link provided');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 });

      await page.waitForSelector('table', { timeout: 60000 }).catch(() => {
        console.warn('Table selector not found within 1 minute');
      });

      const html = await page.content();
      return { page: html };
    } finally {
      await browser.close();
    }
  }
  async receiptParser(html: string) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const rows = Array.from(
      document.querySelectorAll('table tr'),
    ) as HTMLTableRowElement[];
    const result: any = {};

    rows.forEach((row) => {
      const cells = Array.from(
        row.querySelectorAll('td'),
      ) as HTMLTableCellElement[];
      if (cells.length < 2) return;

      const label = cells[0].textContent?.trim().toLowerCase();
      const value = cells[1].textContent?.trim();

      if (!label) return;

      if (label.includes("receiver's account")) result.receiverAccount = value;
      if (label.includes("receiver's name")) result.receiverName = value;
      if (label.includes('transferred amount')) result.amount = value;
      if (label.includes('transaction date')) result.date = value;
      if (label.includes('transaction reference'))
        result.transactionNumber = value;
    });

    return {
      bank: PaymentMethod.ABYSSINIA,
      receipt: {
        date: result.date || '',
        receiverAccount: result.receiverAccount || '',
        receiverName: result.receiverName || '',
        amount: result.amount.replace(/^ETB\s*/i, '').trim() || '',
        transactionNumber: result.transactionNumber || '',
      },
    };
  }
}
