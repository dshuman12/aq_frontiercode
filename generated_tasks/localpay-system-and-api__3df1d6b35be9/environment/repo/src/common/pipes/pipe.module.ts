import { Module } from '@nestjs/common';
import { SmsPreValidatorService } from './sms.pipe';

@Module({
  imports: [],
  controllers: [],
  providers: [SmsPreValidatorService],
  exports: [SmsPreValidatorService],
})
export class PipeModule {}
