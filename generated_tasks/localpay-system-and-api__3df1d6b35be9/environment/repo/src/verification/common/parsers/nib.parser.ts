import { PaymentMethod } from 'src/common/types/bot-enum';
import { ParserAndExtractor } from './parser.interface';

export class NibParser implements ParserAndExtractor {
  extract(text: string, accountNumber?: string): { link: string } {
    throw new Error('Method not implemented.');
  }
  fetch(link: string): Promise<{ page: any }> {
    throw new Error('Method not implemented.');
  }
  async receiptParser(input: string) {
    return {
      bank: PaymentMethod.NIB,
      receipt: {
        date: '',
        receiverAccount: '',
        receiverName: '',
        transactionNumber: '',
        amount: '',
      },
    };
  }
}
