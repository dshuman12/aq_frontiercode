import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';

export type TelegramUserType = {
  telegramId: number;
  username?: string;
  firstName: string;
};

export const TelegramUser = createParamDecorator(
  (data: keyof TelegramUserType | undefined, ctx: ExecutionContext) => {
    const tgCtx = TelegrafExecutionContext.create(ctx).getContext();
    const from = tgCtx.from;

    if (!from) return null;

    const user: TelegramUserType = {
      telegramId: from.id,
      username: from.username,
      firstName: from.first_name || 'there', // fallback if undefined
    };

    return data ? user[data] : user;
  },
);
