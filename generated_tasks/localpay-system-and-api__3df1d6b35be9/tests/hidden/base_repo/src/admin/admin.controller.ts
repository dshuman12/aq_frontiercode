import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateApiKeyDto } from './dto/api-key.dto';
import {
  CreateReceivingAccountDto,
  UpdateReceivingAccountDto,
} from './dto/account.dto';
import {
  CheckoutListQueryDto,
  DepositListQueryDto,
  TransactionListQueryDto,
} from './dto/admin-query.dto';
import { CurrentUser } from 'src/auth/decorators/client-decorator';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import type { AuthUser } from 'src/auth/type/supabase-jwt-payload.type';

@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.adminService.getDashboard(this.getClientId(user));
  }

  @Get('api-keys')
  listApiKeys(@CurrentUser() user: AuthUser) {
    return this.adminService.listApiKeys(this.getClientId(user));
  }

  @Post('api-keys')
  createApiKey(@CurrentUser() user: AuthUser, @Body() dto: CreateApiKeyDto) {
    return this.adminService.createApiKey(this.getClientId(user), dto);
  }

  @Post('api-keys/:apiKeyId/revoke')
  revokeApiKey(
    @CurrentUser() user: AuthUser,
    @Param('apiKeyId') apiKeyId: string,
  ) {
    return this.adminService.revokeApiKey(this.getClientId(user), apiKeyId);
  }

  @Get('accounts')
  listReceivingAccounts(@CurrentUser() user: AuthUser) {
    return this.adminService.listReceivingAccounts(this.getClientId(user));
  }

  @Post('accounts')
  createReceivingAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReceivingAccountDto,
  ) {
    return this.adminService.createReceivingAccount(
      this.getClientId(user),
      dto,
    );
  }

  @Patch('accounts/:accountId')
  updateReceivingAccount(
    @CurrentUser() user: AuthUser,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateReceivingAccountDto,
  ) {
    return this.adminService.updateReceivingAccount(
      this.getClientId(user),
      accountId,
      dto,
    );
  }

  @Delete('accounts/:accountId')
  deleteReceivingAccount(
    @CurrentUser() user: AuthUser,
    @Param('accountId') accountId: string,
  ) {
    return this.adminService.deleteReceivingAccount(
      this.getClientId(user),
      accountId,
    );
  }

  @Get('checkouts')
  listCheckouts(
    @CurrentUser() user: AuthUser,
    @Query() query: CheckoutListQueryDto,
  ) {
    return this.adminService.listCheckouts(this.getClientId(user), query);
  }

  @Get('checkouts/:checkoutId')
  getCheckoutDetail(
    @CurrentUser() user: AuthUser,
    @Param('checkoutId') checkoutId: string,
  ) {
    return this.adminService.getCheckoutDetail(
      this.getClientId(user),
      checkoutId,
    );
  }

  @Get('deposits')
  listDeposits(
    @CurrentUser() user: AuthUser,
    @Query() query: DepositListQueryDto,
  ) {
    return this.adminService.listDeposits(this.getClientId(user), query);
  }

  @Get('deposits/:depositId')
  getDepositDetail(
    @CurrentUser() user: AuthUser,
    @Param('depositId') depositId: string,
  ) {
    return this.adminService.getDepositDetail(
      this.getClientId(user),
      depositId,
    );
  }

  @Get('transactions')
  listTransactions(
    @CurrentUser() user: AuthUser,
    @Query() query: TransactionListQueryDto,
  ) {
    return this.adminService.listTransactions(this.getClientId(user), query);
  }

  @Get('transactions/:transactionId')
  getTransactionDetail(
    @CurrentUser() user: AuthUser,
    @Param('transactionId') transactionId: string,
  ) {
    return this.adminService.getTransactionDetail(
      this.getClientId(user),
      transactionId,
    );
  }

  private getClientId(user: AuthUser) {
    if (!user.clientId) {
      throw new UnauthorizedException(
        'Authenticated user is missing client context.',
      );
    }

    return user.clientId;
  }
}
