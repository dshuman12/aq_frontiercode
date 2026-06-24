import { PaymentMethod } from 'src/common/types/bot-enum';

export interface ParserAndExtractor {
  receiptParser(input: string): Promise<{
    bank: PaymentMethod;
    receipt: {
      date: string;
      receiverAccount: string;
      receiverName: string;
      amount: string;
      transactionNumber: string;
    };
  }>;
  extract(
    text: string,
    accountNumber?: string,
  ): {
    link: string;
  };
  fetch(link: string): Promise<{
    page: any;
  }>;
}
