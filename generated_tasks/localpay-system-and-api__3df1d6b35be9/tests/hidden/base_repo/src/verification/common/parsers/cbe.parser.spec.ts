jest.mock('pdf-parse', () => jest.fn());

import pdf from 'pdf-parse';
import { CbeParser } from './cbe.parser';

describe('CbeParser', () => {
  const parser = new CbeParser();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts CBE link from FT code and appends account tail when needed', () => {
    const out = parser.extract('... FT260790RGK5 ...', '1234567890123456');
    expect(out.link).toContain('https://apps.cbe.com.et:100/?id=FT260790RGK5');
  });

  it('parses receipt fields from PDF text', async () => {
    (pdf as jest.Mock).mockResolvedValue({
      text: `Receiver JOHN DOE Account12345678
      Transferred Amount 470.00 ETB
      Payment Date & Time 3/11/2026, 6:15:00 PM
      Reference No. FT260790RGK518872366`,
    });

    const res = await parser.receiptParser(Buffer.from('%PDF mock'));
    expect(res.receipt.transactionNumber).toBe('FT260790RGK518872366');
    expect(res.receipt.amount).toBe('470.00');
    expect(res.receipt.receiverAccount).toBe('12345678');
  });
});
