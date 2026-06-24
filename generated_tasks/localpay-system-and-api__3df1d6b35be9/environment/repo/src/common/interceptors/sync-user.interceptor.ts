import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/email.auth';
import { LruCacheService } from 'src/common/cache/lru-cache.service';

@Injectable()
export class UserSyncInterceptor implements NestInterceptor {
  private readonly syncTtlMs: number;

  constructor(
    private readonly auth: AuthService,
    private readonly cache: LruCacheService,
    private readonly config: ConfigService,
  ) {
    const configuredTtl = Number(this.config.get('USER_SYNC_CACHE_TTL_MS'));
    this.syncTtlMs =
      Number.isFinite(configuredTtl) && configuredTtl > 0
        ? configuredTtl
        : 5 * 60_000;
  }

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const webUser = req.webUser;

    // If no user info → just continue request
    if (!webUser?.userId || !webUser?.email) {
      return next.handle();
    }
    const { userId, email } = webUser;
    const cacheKey = `user-sync:${userId}`;

    if (userId) {
      await this.cache.getOrSet(
        cacheKey,
        async () => {
          await this.auth.syncUser(userId, email);
          return true;
        },
        this.syncTtlMs,
      );
    }

    return next.handle();
  }
}
