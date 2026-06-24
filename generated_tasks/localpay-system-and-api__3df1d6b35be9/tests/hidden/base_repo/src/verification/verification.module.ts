import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { OcrService } from './ocr/ocr.service';
import { SmsParserService } from './sms-parser/sms-parser.service';

import { LinkParserService } from './link-praser/link-praser.service';
import { PaymentValidationService } from './validators/PaymentValidationService';
import { GenericValidation } from './validators/validation.generic';
import { AmountMatchesPipe } from './common/validation-pipes/amount-matches.pipe';
import { DuplicateTransactionPipe } from './common/validation-pipes/duplicate-transaction.pipe';
import { ReceiverAccountMatchesPipe } from './common/validation-pipes/receiver-account-matches.pipe';
import { TimestampValidPipe } from './common/validation-pipes/timestamp-valid.pipe';
import { TransactionsModule } from 'src/transactions/transactions.module';
import { PrismaModule } from 'src/common/prisma/prisma.module';

@Module({
  imports: [TransactionsModule, PrismaModule],
  providers: [
    VerificationService,
    OcrService,
    SmsParserService,
    LinkParserService,
    PaymentValidationService,
    GenericValidation,
    AmountMatchesPipe,
    DuplicateTransactionPipe,
    ReceiverAccountMatchesPipe,
    TimestampValidPipe,
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
