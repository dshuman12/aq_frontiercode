import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { WebAuthGuard } from './web-auth.guard';

describe('WebAuthGuard', () => {
  const authService = {} as any;
  let guard: WebAuthGuard;

  const makeContext = (req: Record<string, any>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    guard = new WebAuthGuard(authService);
  });

  it('attaches a webUser when the token is valid', async () => {
    const req = { headers: { authorization: 'Bearer token' } } as any;
    const context = makeContext(req);

    jest
      .spyOn(guard as any, 'verifySessionJwt')
      .mockResolvedValue({ userId: 'uid', email: 'u@e.com' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.webUser).toEqual({ userId: 'uid', email: 'u@e.com' });
  });

  it('throws when Authorization header is missing', async () => {
    const context = makeContext({ headers: {} });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
