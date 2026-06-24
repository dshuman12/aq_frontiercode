import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';
import { VerificationMethod } from 'src/common/types/bot-enum';

// One entry per receipt — only raw proofs come from the client.
// The server extracts everything else (amount, date, transactionId) internally
// inside the single /bulk endpoint. Extracted data never travels client→server.
export class BulkReceiptDto {
  /** Raw proof: transaction link, SMS body, or null for screenshot */
  @IsOptional()
  @IsString()
  rawProof?: string | null;

  /** File ID for screenshot receipts */
  @IsOptional()
  @IsString()
  telegramFileId?: string | null;

  /**
   * Per-receipt declared amount.
   * Passed to extractBulkReceipt() so the parser can cross-check the
   * extracted amount against what the user claims they sent.
   */
  @IsNumber()
  @Min(1)
  amount: number;
}

export class BulkDepositDto {
  /**
   * Total declared amount across ALL receipts.
   * After all receipts are extracted server-side, their amounts are summed
   * and compared against this value. Mismatch → 400 before pipeline runs.
   */
  @IsNumber()
  @Min(1)
  declaredTotal: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsEnum(VerificationMethod)
  verificationMethod: VerificationMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BulkReceiptDto)
  receipts: BulkReceiptDto[];
}
