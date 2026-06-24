import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../type/supabase-jwt-payload.type';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
