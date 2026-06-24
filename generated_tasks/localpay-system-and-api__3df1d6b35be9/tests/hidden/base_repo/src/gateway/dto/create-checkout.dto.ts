import {
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  api_key: string;

  @IsString()
  api_secret: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  product_name: string;

  @IsString()
  customer_name: string;

  @IsEmail()
  customer_email: string;

  @IsUrl()
  webhook_url: string;

  @IsUrl()
  success_url: string;

  @IsUrl()
  cancel_url: string;

  @IsUrl()
  failed_url: string;

  @IsString()
  invoice_id: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  expires_in_seconds?: number;
}
