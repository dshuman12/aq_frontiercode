import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WebUser } from './web-auth.guard';

export const WebUserReq = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WebUser => {
    return ctx.switchToHttp().getRequest().webUser;
  },
);
