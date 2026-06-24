import { IsString } from 'class-validator';

// Payload their platform sends to POST /gateway/verify-payment
// after receiving our webhook — to double-confirm the payment.
export class VerifyPaymentDto {
  @IsString()
  TrxID!: string;

  @IsString()
  CheckoutID!: string;

  @IsString()
  InvoiceID!: string;
}
