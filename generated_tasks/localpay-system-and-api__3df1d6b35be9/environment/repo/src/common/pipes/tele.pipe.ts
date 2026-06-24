import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

export const ALLOWED_DOMAINS = ['transactioninfo.ethiotelecom.et'];

@Injectable()
export class TelebirrUrlPipe implements PipeTransform {
  transform(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('⚠️ No URL provided.');
    }

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      throw new BadRequestException(
        '⚠️ Invalid URL format. Please send a valid Telebirr receipt link.',
      );
    }

    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      throw new BadRequestException(
        '⚠️ Insecure link. Only HTTPS Telebirr receipt links are accepted.',
      );
    }

    // Must be an allowed Telebirr domain
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );

    if (!isAllowed) {
      throw new BadRequestException(
        '⚠️ Unrecognized receipt domain. Please send the original Telebirr receipt link.',
      );
    }

    // Must contain /receipt/ path segment
    const hasReceiptPath = parsed.pathname
      .split('/')
      .some((p) => p.toLowerCase() === 'receipt');

    if (!hasReceiptPath) {
      throw new BadRequestException(
        '⚠️ The link does not appear to be a Telebirr receipt. Please check the link and try again.',
      );
    }

    return parsed.toString();
  }
}
