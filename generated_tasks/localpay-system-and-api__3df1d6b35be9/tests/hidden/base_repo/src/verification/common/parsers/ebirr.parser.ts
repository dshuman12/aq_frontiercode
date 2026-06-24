import { PaymentMethod } from 'src/common/types/bot-enum';
import { ParserAndExtractor } from './parser.interface';
import axios from 'axios';
import { JSDOM } from 'jsdom';

export class EBirrParser implements ParserAndExtractor {
  extract(sms: string, accountNumber?: string): { link: string } {
    const text = this.cleanText(sms);
    const match = text.match(
      /https:\/\/transactioninfo\.ebirr\.com\/[\w-]+\/receipt\/([A-Z0-9]{8,})/i,
    );
    if (!match) return { link: '' };

    const trx = match[1];

    return {
      link: `https://transactioninfo.ebirr.com/kaafimf-Ebirr/receipt/${trx}`,
    };
  }

  async fetch(link: string): Promise<{ page: any }> {
    if (!link) throw new Error('No link provided');

    const response = await axios.get(link);
    return { page: response.data };
  }

  async receiptParser(html: string) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const getValueByLabel = (label: string): string => {
      const cells = Array.from(
        document.querySelectorAll('td.invoice'),
      ) as HTMLElement[];

      const labelCell = cells.find((td) =>
        td.textContent?.trim().toUpperCase().includes(label),
      );

      if (!labelCell) return '';

      const valueCell = labelCell.nextElementSibling as HTMLElement | null;
      if (!valueCell) return '';

      let text = valueCell.textContent?.trim() ?? '';
      return text.replace(/ETB/gi, '').trim();
    };

    const headings = Array.from(
      document.querySelectorAll('div.heading'),
    ) as HTMLElement[];

    const receiverDiv = headings.find((div) =>
      div.textContent?.includes('Receiver Info'),
    );

    let receiverName = '';
    let receiverAccount = '';

    if (receiverDiv) {
      const table = (receiverDiv as HTMLElement)
        .nextElementSibling as HTMLElement | null;
      const rows = Array.from(
        table?.querySelectorAll('tr') ?? [],
      ) as HTMLElement[];

      receiverName = rows[1]?.textContent?.trim() || '';
      receiverAccount = rows[3]?.textContent?.trim() || '';
    }

    return {
      bank: PaymentMethod.EBIRR,
      receipt: {
        date: getValueByLabel('DATE'),
        transactionNumber: getValueByLabel('RECEIPT NO'),
        amount: getValueByLabel('AMOUNT'),
        receiverName,
        receiverAccount,
      },
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
