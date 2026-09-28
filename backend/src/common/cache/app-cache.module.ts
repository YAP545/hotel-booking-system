import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AppCacheService } from './app-cache.service';

@Global()
@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60000, // 60s default TTL for read paths
    }),
  ],
  providers: [AppCacheService],
  exports: [CacheModule, AppCacheService],
})
export class AppCacheModule {}
