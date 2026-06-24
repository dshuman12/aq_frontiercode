import { PaymentMethod } from 'src/common/types/bot-enum';
import { ParserAndExtractor } from './parser.interface';
import axios from 'axios';
import pdf from 'pdf-parse';
import { BadRequestException } from '@nestjs/common';

export class CbeParser implements ParserAndExtractor {
  // ─────────────────────────────────────────────────────────────────
  // STEP 1: Extract verification link from SMS
  // Supports both old (apps.cbe.com.et) and new (mbreciept.cbe.com.et)
  // ─────────────────────────────────────────────────────────────────
  extract(text: string, accountNumber?: string): { link: string } {
    if (!text) throw new Error('SMS text is empty');

    const cleaned = text
      .replace(/https?:\/\/\s+/gi, 'https://')
      .replace(/\?\s+/g, '?')
      .replace(/=\s+/g, '=');

    // ── NEW FORMAT ────────────────────────────────────────────────
    // https://Mbreciept.cbe.com.et/FT26093JCD32-18872366
    const newFormat = cleaned.match(
      /https?:\/\/[Mm]breciept\.cbe\.com\.et\/([A-Z0-9]+-\d+)/i,
    );
    if (newFormat) {
      return {
        link: `https://mbreciept.cbe.com.et/${newFormat[1].toUpperCase()}`,
      };
    }

    // ── OLD FORMAT ────────────────────────────────────────────────
    // https://apps.cbe.com.et:100/?id=FT26093JCD3218872366
    const buildOldLink = (trxId: string): string => {
      const upper = trxId.toUpperCase();
      if (upper.length <= 19 && accountNumber && accountNumber.length >= 8) {
        return `https://apps.cbe.com.et:100/?id=${upper.slice(0, 12)}${accountNumber.slice(-8)}`;
      }
      return `https://apps.cbe.com.et:100/?id=${upper}`;
    };

    const oldUrlMatch = cleaned.match(
      /https?:\/\/apps\.cbe\.com\.et:\d+\/\?i{1,2}d=([A-Z0-9]+)/i,
    );
    if (oldUrlMatch) return { link: buildOldLink(oldUrlMatch[1]) };

    const idParamMatch = cleaned.match(/\bi{1,2}[dD]=([A-Z0-9]{10,})/i);
    if (idParamMatch) return { link: buildOldLink(idParamMatch[1]) };

    const ftMatch = cleaned.match(/\b(FT[A-Z0-9]{8,})\b/i);
    if (ftMatch) return { link: buildOldLink(ftMatch[1]) };

    throw new Error('No valid CBE transaction link found in SMS');
  }

  // ─────────────────────────────────────────────────────────────────
  // STEP 2: Fetch receipt — PDF (old) or JSON API (new)
  // Encodes format as a prefix in the returned page buffer:
  //   "PDF:" + <pdf bytes>
  //   "JSON:" + <json string>
  // receiptParser reads the prefix to know how to parse
  // ─────────────────────────────────────────────────────────────────
  async fetch(link: string): Promise<{ page: any }> {
    return this.isNewFormat(link) ? this.fetchJson(link) : this.fetchPdf(link);
  }

  // ─────────────────────────────────────────────────────────────────
  // STEP 3: Parse receipt — detects format from buffer prefix
  // Satisfies interface: receiptParser(input: String)
  // In practice receives the Buffer from fetch() via page property
  // ─────────────────────────────────────────────────────────────────
  async receiptParser(input: any) {
    if (!input) throw new Error('No receipt data to parse');

    // Convert to Buffer if needed
    const buf: Buffer = Buffer.isBuffer(input)
      ? input
      : Buffer.from(input as string, 'utf-8');

    // Read prefix to detect format
    const prefix = buf.slice(0, 5).toString('utf-8');

    if (prefix === 'JSON:') {
      return this.parseJson(buf.slice(5));
    }

    // Default: treat as PDF (with or without "PDF:" prefix)
    const pdfBuf = prefix === 'PDF:' ? buf.slice(4) : buf;
    return this.parsePdf(pdfBuf);
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: Fetch new-format receipt via JSON API
  // ─────────────────────────────────────────────────────────────────
  private async fetchJson(link: string): Promise<{ page: Buffer }> {
    const match = link.match(/mbreciept\.cbe\.com\.et\/([A-Z0-9]+-\d+)/i);
    if (!match) throw new BadRequestException('Invalid new-format CBE link');

    const txnId = match[1].toUpperCase();

    try {
      const url = `https://mb.cbe.com.et/api/v1/transactions/public/transaction-detail/${txnId}`;
      console.log('🔗 CBE API URL:', url);

      const response = await axios.get(url, {
        timeout: 30000,
        validateStatus: () => true,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          Origin: 'https://mbreciept.cbe.com.et',
          Referer: 'https://mbreciept.cbe.com.et/',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'x-app-id': 'd1292e42-7400-49de-a2d3-9731caa4c819',
          'x-app-version': '0a01980b-9859-1369-8198-59f403820000',
        },
      });

      console.log('📦 CBE API status:', response.status);
      console.log('📦 CBE API response:', JSON.stringify(response.data));

      if (response.status !== 200 || !response.data) {
        throw new BadRequestException(
          `CBE API returned status ${response.status} for transaction: ${txnId}`,
        );
      }

      const json =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);

      return {
        page: Buffer.concat([
          Buffer.from('JSON:', 'utf-8'),
          Buffer.from(json, 'utf-8'),
        ]),
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        `Failed to fetch CBE receipt for transaction: ${txnId}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: Fetch old-format receipt as PDF
  // ─────────────────────────────────────────────────────────────────
  private async fetchPdf(link: string): Promise<{ page: Buffer }> {
  try {
    const response = await axios.get(link, {
      responseType: 'arraybuffer',
      timeout: 30000,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/pdf',
      },
    });

    const buffer = Buffer.from(response.data);

    // ✅ If old server returns 404, extract txnId and fall back to new JSON API
    if (response.status === 404) {
      const txnIdMatch = link.match(/id=([A-Z0-9]+)/i);
      if (txnIdMatch) {
        const txnId = txnIdMatch[1].slice(0, 12); // strip account suffix → FT260964LMTO
        const accountSuffix = txnIdMatch[1].slice(12); // 80798625
        const newLink = `https://mbreciept.cbe.com.et/${txnId}-${accountSuffix}`;
        console.log('⚠️ Old PDF 404, falling back to new API:', newLink);
        return this.fetchJson(newLink);
      }
      throw new BadRequestException('PDF not found and no fallback possible');
    }

    if (response.status !== 200) {
      throw new BadRequestException(
        `Unexpected HTTP status: ${response.status}`,
      );
    }

    const preview = buffer.toString('utf-8', 0, 300).toLowerCase();
    if (
      preview.includes('<html') ||
      preview.includes('access denied') ||
      preview.includes('forbidden') ||
      preview.includes('you are not allowed')
    ) {
      throw new BadRequestException('Server returned HTML instead of PDF');
    }

    if (!buffer.subarray(0, 4).toString().startsWith('%PDF')) {
      throw new BadRequestException('Response is not a valid PDF');
    }

    if (buffer.length < 1000) {
      throw new BadRequestException('PDF is too small — likely invalid');
    }

    return {
      page: Buffer.concat([
        Buffer.from('PDF:', 'utf-8'),
        buffer,
      ]),
    };
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    throw new BadRequestException('Failed to fetch CBE PDF receipt');
  }
}

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: Parse new JSON receipt
  // ─────────────────────────────────────────────────────────────────
  private parseJson(input: Buffer) {
    let data: Record<string, any>;
    try {
      data = JSON.parse(input.toString('utf-8'));
    } catch {
      throw new Error('Failed to parse JSON receipt data');
    }

    return {
      bank: PaymentMethod.CBE,
      receipt: {
        transactionNumber: (data.id ?? '').toString().toUpperCase().trim(),
        date: this.parseDate(data.dateTimes?.[0] ?? data.processingDate ?? ''),
        receiverAccount: (data.creditAccountNo ?? '').trim(),
        receiverName: (data.creditAccountHolder ?? '').trim(),
        amount: (data.amountDebited ?? data.debitAmount ?? '')
          .toString()
          .replace(/,/g, '')
          .trim(),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: Parse old PDF receipt
  // ─────────────────────────────────────────────────────────────────
  private async parsePdf(input: Buffer) {
    let text: string;
    try {
      const parsed = await pdf(input);
      text = parsed.text ?? '';
    } catch (err) {
      throw new Error('Failed to parse PDF: ' + (err as Error).message);
    }

    if (!text.trim()) throw new Error('PDF parsed but no text extracted');

    const s = text.replace(/\s+/g, ' ').trim();

    return {
      bank: PaymentMethod.CBE,
      receipt: {
        transactionNumber: (
          s.match(
            /Reference\s*No[.\s]*(?:\(VAT\s*Invoice\s*No\))?\s*([A-Z0-9]{8,})/i,
          )?.[1] ??
          s.match(/\b(FT[A-Z0-9]{8,})\b/)?.[1] ??
          ''
        )
          .trim()
          .toUpperCase(),

        date:
          s
            .match(/Payment\s*Date\s*&\s*Time\s*([\d\/,: ]+(?:AM|PM))/i)?.[1]
            ?.trim() ?? '',

        receiverAccount:
          s.match(/Receiver[A-Z\s]+Account([\d*]+)/i)?.[1]?.trim() ?? '',

        receiverName:
          s.match(/Receiver([A-Z][A-Z\s]+?)(?=Account)/i)?.[1]?.trim() ?? '',

        amount:
          s
            .match(/Transferred\s*Amount\s*([\d,]+(?:\.\d{2})?)\s*ETB/i)?.[1]
            ?.replace(/,/g, '')
            .trim() ?? '',
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: Helpers
  // ─────────────────────────────────────────────────────────────────
  private isNewFormat(link: string): boolean {
    return /mbreciept\.cbe\.com\.et/i.test(link);
  }

  private parseDate(raw: string): string {
    if (!raw) return '';

    // ISO: "2026-04-02T18:09:00Z"
    if (raw.includes('T')) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      }
    }

    // Compact: "20260403" → "04/03/2026"
    if (/^\d{8}$/.test(raw)) {
      return `${raw.slice(4, 6)}/${raw.slice(6, 8)}/${raw.slice(0, 4)}`;
    }

    return raw;
  }
}
