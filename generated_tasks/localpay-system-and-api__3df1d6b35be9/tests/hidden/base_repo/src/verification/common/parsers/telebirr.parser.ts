import { PaymentMethod } from 'src/common/types/bot-enum';
import { ParserAndExtractor } from './parser.interface';
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';
import puppeteer from 'puppeteer';
import { TelebirrReceipt } from '../type';
export class TelebirrParser implements ParserAndExtractor {
  extract(text: string, accountNumber?: string): { link: string } {
    if (!text) return { link: '' };
    const cleaned = this.cleanText(text);

    // Strategy 2: "your transaction number is XXXX" (classic SMS)
    const txnNumberMatch = cleaned.match(
      /your transaction number is\s+([A-Z0-9]{8,12})/i,
    );
    if (txnNumberMatch) {
      const trx = txnNumberMatch[1].replace(/[^A-Z0-9]/gi, '').toUpperCase();
      return {
        link: `https://transactioninfo.ethiotelecom.et/receipt/${trx}`,
      };
    }

    // Strategy 3: "Transaction Number: XXXX" (app share format)
    const appShareMatch = cleaned.match(
      /Transaction\s+Number\s*[:\-]?\s*([A-Z0-9]{8,12})(?:\s|$|[^A-Z0-9])/i,
    );
    if (appShareMatch) {
      const trx = appShareMatch[1].replace(/[^A-Z0-9]/gi, '').toUpperCase();
      return {
        link: `https://transactioninfo.ethiotelecom.et/receipt/${trx}`,
      };
    }

    // Strategy 4: fallback on raw text before cleanText
    const rawMatch = text.match(
      /your transaction number is\s+([A-Z0-9]{8,12})/i,
    );
    if (rawMatch) {
      const trx = rawMatch[1].replace(/[^A-Z0-9]/gi, '').toUpperCase();
      return {
        link: `https://transactioninfo.ethiotelecom.et/receipt/${trx}`,
      };
    }

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
      await page.goto(link, {
        waitUntil: 'domcontentloaded', // ✅ faster + safer
        timeout: 60000,
      });
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
    const $ = cheerio.load(html);

    const receipt: TelebirrReceipt = {
      transactionNumber: '',
      date: '',
      amount: '0',
      senderAccount: '',
      receiverAccount: '',
      receiverName: '',
    };

    let transactionRow: cheerio.Cheerio<Element> | undefined;

    $('tr').each((_, tr) => {
      const tds = $(tr).find('td');

      if (tds.length === 3) {
        const tx = tds.eq(0).text().trim();

        if (/^[A-Z0-9]{8,12}$/.test(tx)) {
          transactionRow = tds;
        }
      }
    });

    if (transactionRow) {
      receipt.transactionNumber = transactionRow.eq(0).text().trim();
      receipt.date = transactionRow.eq(1).text().trim();

      const amountText = transactionRow.eq(2).text().trim();
      receipt.amount = amountText.replace(/[^\d.]/g, '');
    }
    const extractByLabel = (label: string): string => {
      return $('td')
        .filter((_, el) => $(el).text().includes(label))
        .next('td')
        .text()
        .trim();
    };
    receipt.senderAccount = extractByLabel('Payer telebirr no');
    receipt.receiverName = extractByLabel('Credited Party name');
    receipt.receiverAccount = extractByLabel('Credited party account no');
    if (!receipt.transactionNumber) {
      throw new Error('Invalid Telebirr receipt: transaction not found');
    }

    return {
      bank: PaymentMethod.TELEBIRR,
      receipt,
    };
  }
  private cleanText(text: string) {
    return text
      .replace(/\s+/g, ' ') // collapse multiple spaces
      .replace(/https:\s*\/\//gi, 'https://') // fix https spacing
      .replace(/\s*\/\s*/g, '/') // remove spaces around slashes
      .trim();
  }
}
