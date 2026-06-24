import { Module } from '@nestjs/common';

import { DepositTransactionRepository } from './transactions.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],

  providers: [DepositTransactionRepository],
  exports: [DepositTransactionRepository],
})
export class TransactionsModule {}
