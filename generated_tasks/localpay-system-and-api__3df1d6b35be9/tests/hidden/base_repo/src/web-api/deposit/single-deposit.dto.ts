import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { VerificationMethod } from 'src/common/types/bot-enum';

export class SingleDepositDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsEnum(VerificationMethod)
  verificationMethod: VerificationMethod;

  /**
   * The raw proof text.
   * - LINK: transaction URL
   * - SMS: forwarded SMS body
   * - SCREENSHOT: not used (send null; image upload handled separately)
   */
  @IsOptional()
  @IsString()
  rawProof?: string | null;

  @IsOptional()
  @IsString()
  accountNumber?: string | undefined;

  @IsOptional()
  @IsString()
  checkoutId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}
