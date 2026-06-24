import { PaymentMethod } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateReceivingAccountDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @MaxLength(120)
  accountNumber: string;

  @IsString()
  @MaxLength(160)
  accountName: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateReceivingAccountDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  accountName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
