import { SmsParserService } from './sms-parser.service';

describe('SmsParserService', () => {
  let service: SmsParserService;
  let originalParsers: any;

  beforeEach(() => {
    service = new SmsParserService();
    originalParsers = (service as any).parsers;
  });

  afterEach(() => {
    (service as any).parsers = originalParsers;
    jest.restoreAllMocks();
  });

  it('runs extract, fetch, and receiptParser in sequence', async () => {
    const mockParser = {
      extract: jest.fn(() => ({ link: 'link' })),
      fetch: jest.fn().mockResolvedValue({ page: Buffer.from('page') }),
      receiptParser: jest.fn().mockResolvedValue({
        bank: 'CBE',
        receipt: { transactionNumber: 'TX1', amount: '10' },
      }),
    };

    (service as any).parsers = { CBE: mockParser };

    const res = await service.smsPrase('CBE', 'body text', '1234');

    expect(mockParser.extract).toHaveBeenCalledWith('body text', '1234');
    expect(mockParser.fetch).toHaveBeenCalledWith('link');
    expect(mockParser.receiptParser).toHaveBeenCalledWith(Buffer.from('page'));
    expect(res.bank).toBe('CBE');
    expect(res.receipt.receipt.transactionNumber).toBe('TX1');
  });
});
