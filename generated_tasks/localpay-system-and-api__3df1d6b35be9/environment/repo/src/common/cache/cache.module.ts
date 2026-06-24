import { Global, Module } from '@nestjs/common';
import { LruCacheService } from './lru-cache.service';

@Global()
@Module({
  providers: [LruCacheService],
  exports: [LruCacheService],
})
export class CacheModule {}
