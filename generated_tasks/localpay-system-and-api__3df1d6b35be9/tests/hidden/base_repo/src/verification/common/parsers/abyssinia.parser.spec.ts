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

import { AbyssiniaParser } from './abyssinia.parser';

describe('AbyssiniaParser', () => {
  const parser = new AbyssiniaParser();

  it('extracts BOA slip link from trx', () => {
    const out = parser.extract(
      'https://cs.bankofabyssinia.com/slip/?trx=FT26023J258M',
    );
    expect(out.link).toBe(
      'https://cs.bankofabyssinia.com/slip/?trx=FT26023J258M',
    );
  });

  it('parses receipt html', async () => {
    const html = `
      <table>
        <tr><td>Receiver's account</td><td>10001234</td></tr>
        <tr><td>Receiver's name</td><td>Receiver B</td></tr>
        <tr><td>Transferred amount</td><td>ETB 25.50</td></tr>
        <tr><td>Transaction date</td><td>23/01/26 14:04</td></tr>
        <tr><td>Transaction reference</td><td>FT26023J258M</td></tr>
      </table>
    `;
    const res = await parser.receiptParser(html);
    expect(res.receipt.transactionNumber).toBe('FT26023J258M');
    expect(res.receipt.amount).toBe('25.50');
    expect(res.receipt.receiverName).toBe('Receiver B');
  });
});
