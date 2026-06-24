jest.mock('jsdom', () => {
  const cheerio = require('cheerio');
  class MockJSDOM {
    window: any;
    constructor(html: string) {
      const $ = cheerio.load(html);
      const wrap = (el: any): any => {
        if (!el) return null;
        return {
          textContent: $(el).text(),
          nextElementSibling: wrap($(el).next()[0]),
          querySelectorAll: (selector: string) =>
            $(el)
              .find(selector)
              .toArray()
              .map((child: any) => wrap(child)),
        };
      };
      this.window = {
        document: {
          querySelectorAll: (selector: string) =>
            $(selector)
              .toArray()
              .map((el: any) => wrap(el)),
        },
      };
    }
  }
  return { JSDOM: MockJSDOM };
});

import { EBirrParser } from './ebirr.parser';

describe('EBirrParser', () => {
  const parser = new EBirrParser();

  it('extracts eBirr receipt link', () => {
    const out = parser.extract(
      'https://transactioninfo.ebirr.com/kaafimf-Ebirr/receipt/1234567890',
    );
    expect(out.link).toBe(
      'https://transactioninfo.ebirr.com/kaafimf-Ebirr/receipt/1234567890',
    );
  });

  it('parses receipt html', async () => {
    const html = `
      <div class="heading">Receiver Info</div>
      <table>
        <tr><td>Ignore</td></tr>
        <tr><td>Receiver C</td></tr>
        <tr><td>Ignore2</td></tr>
        <tr><td>251900000000</td></tr>
      </table>
      <table>
        <tr><td class="invoice">DATE</td><td>2026-02-11 20:07:02 +0300 EAT</td></tr>
        <tr><td class="invoice">RECEIPT NO</td><td>RCP12345</td></tr>
        <tr><td class="invoice">AMOUNT</td><td>ETB 75.00</td></tr>
      </table>
    `;
    const res = await parser.receiptParser(html);
    expect(res.receipt.transactionNumber).toBe('RCP12345');
    expect(res.receipt.amount).toBe('75.00');
    expect(res.receipt.receiverName).toBe('Receiver C');
  });
});
