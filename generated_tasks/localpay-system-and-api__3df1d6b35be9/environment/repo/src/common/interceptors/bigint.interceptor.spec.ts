import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { BigIntInterceptor } from './bigint.interceptor';

describe('BigIntInterceptor', () => {
  let interceptor: BigIntInterceptor;

  beforeEach(() => {
    interceptor = new BigIntInterceptor();
  });

  function makeHandler(payload: any): CallHandler {
    return {
      handle: () => of(payload),
    } as CallHandler;
  }

  it('converts bigint fields when context is HTTP', async () => {
    const context = { getType: () => 'http' } as ExecutionContext;
    const result = await lastValueFrom(
      interceptor.intercept(
        context,
        makeHandler({ id: BigInt(10), nested: { value: BigInt(3) } }),
      ),
    );

    expect(result).toEqual({ id: '10', nested: { value: '3' } });
  });

  it('skips transformation for non-http contexts', async () => {
    const context = { getType: () => 'rpc' } as ExecutionContext;
    const payload = { id: BigInt(5) };
    const result = await lastValueFrom(
      interceptor.intercept(context, makeHandler(payload)),
    );

    expect(result).toBe(payload);
  });
});
