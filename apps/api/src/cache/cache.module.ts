import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    RedisModule,
    CacheModule.register({
      ttl: 300, // Default TTL of 5 minutes
      isGlobal: true,
    }),
  ],
  exports: [CacheModule],
})
export class AppModuleCacheModule {}
