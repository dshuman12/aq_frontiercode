import { IsNumber, IsOptional, IsString } from 'class-validator';

export class VerifyCheckoutDto {
  @IsString()
  transactionId: string;

  @IsString()
  depositId: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsNumber()
  amount: number;
}
