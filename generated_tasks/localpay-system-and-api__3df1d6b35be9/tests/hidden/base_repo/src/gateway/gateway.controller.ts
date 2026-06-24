import { Body, Controller, Param, Post } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { VerifyCheckoutDto } from './dto/verify-checkout.dto';
import { VerifyPaymentDto } from './dto/Verify-payment.dto';

@Controller('gateway')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  // Called by their platform when a user initiates a deposit
  @Post('checkout')
  createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.gatewayService.createCheckout(dto);
  }

  // Called by our Next.js proxy after OCR/validation confirms the deposit
  @Post('verify/:checkoutId')
  verifyCheckout(
    @Param('checkoutId') checkoutId: string,
    @Body() dto: VerifyCheckoutDto,
  ) {
    return this.gatewayService.verifyCheckout(checkoutId, dto);
  }
  @Post('verify-payment')
  verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.gatewayService.verifyPayment(dto);
  }
}
