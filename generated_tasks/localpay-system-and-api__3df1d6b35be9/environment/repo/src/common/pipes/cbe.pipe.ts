import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

type AllowedConfig = {
  hostname: string;
  port?: string;
  type: 'query' | 'path';
};

const ALLOWED_URLS: AllowedConfig[] = [
  {
    hostname: 'apps.cbe.com.et',
    port: '100',
    type: 'query', // old format
  },
  {
    hostname: 'mbreciept.cbe.com.et',
    type: 'path', // new format
  },
];

@Injectable()
export class CBEBankUrlPipe implements PipeTransform {
  transform(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('⚠️ No URL provided.');
    }

    let parsed: URL;

    try {
      parsed = new URL(url.trim());
    } catch {
      throw new BadRequestException(
        '⚠️ Invalid URL format. Please send a valid CBE receipt link.',
      );
    }

    // ✅ HTTPS only
    if (parsed.protocol !== 'https:') {
      throw new BadRequestException('⚠️ Only HTTPS links are allowed.');
    }

    const config = ALLOWED_URLS.find(
      (c) => parsed.hostname.toLowerCase() === c.hostname,
    );

    if (!config) {
      throw new BadRequestException('⚠️ Unrecognized CBE receipt domain.');
    }

    // ✅ Validate port if required
    if (config.port && parsed.port !== config.port) {
      throw new BadRequestException('⚠️ Invalid port for this receipt link.');
    }

    // ✅ Validate receipt structure
    if (config.type === 'query') {
      if (!parsed.searchParams.get('id')) {
        throw new BadRequestException('⚠️ Missing receipt ID in query.');
      }
    }

    if (config.type === 'path') {
      const receiptCode = parsed.pathname.replace('/', '');

      // basic validation (you can make stricter)
      const isValid = /^[A-Z0-9-]+$/.test(receiptCode);

      if (!receiptCode || !isValid) {
        throw new BadRequestException('⚠️ Invalid receipt code in URL path.');
      }
    }

    return parsed.toString();
  }
}
