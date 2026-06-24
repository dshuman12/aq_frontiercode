import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WebAuthGuard } from '../auth/web-auth.guard';
import { WebUserReq } from '../auth/web-user.decorator';
import type { WebUser } from '../auth/web-auth.guard';
import { PrismaService } from 'src/common/prisma/prisma.service';

class HistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;
}

@UseGuards(WebAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('history')
export class HistoryController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  async getHistory(
    @WebUserReq() user: WebUser,
    @Query() query: HistoryQueryDto,
  ) {
    const page = query.page ?? 0;
    const pageSize = query.pageSize ?? 10;
    const userIdBig = user.userId;

    const [deposits, total] = await Promise.all([
      this.prisma.depositRequest.findMany({
        where: { userId: userIdBig },
        orderBy: { createdAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        include: {
          crawlResult: { select: { transactionId: true } },
          receipt: { select: { extractedTransactionId: true, type: true } },
        },
      }),
      this.prisma.depositRequest.count({
        where: { userId: userIdBig },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < total,
      deposits: deposits.map((d) => ({
        id: d.id,
        amount: d.amount,
        paymentMethod: d.paymentMethod,
        verificationMethod: d.receipt?.type ?? null,
        status: d.status,
        rejectionReason: d.rejectionReason ?? null,
        transactionId:
          d.crawlResult?.transactionId ??
          d.receipt?.extractedTransactionId ??
          null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    };
  }
}
