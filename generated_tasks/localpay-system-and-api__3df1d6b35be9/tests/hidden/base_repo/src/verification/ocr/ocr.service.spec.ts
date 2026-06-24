import { BadRequestException } from '@nestjs/common';
import { OcrService } from './ocr.service';

describe('OcrService', () => {
  let service: OcrService;

  beforeEach(() => {
    service = new OcrService();
  });

  it('throws when an unsupported bank is requested', async () => {
    await expect(
      service.recognize('UNKNOWN' as any, 'http://image'),
    ).rejects.toThrow(BadRequestException);
  });

  it('sanitizes OCR text fragments', () => {
    const dirty =
      'Line1\nLine2   with   spaces https:// example.com/receipt/ID [receipt/123]';
    const sanitized = (service as any).sanitizeOCR(dirty);

    expect(sanitized).toContain('Line1 Line2');
    expect(sanitized).toContain('https://example.com/receipt/ID');
  });
});
