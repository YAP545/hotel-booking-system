import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AppCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return (await this.cacheManager.get<T>(key)) ?? undefined;
  }

  async set(key: string, value: any, ttlMs?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async reset(): Promise<void> {
    const mgr = this.cacheManager as any;
    if (typeof mgr.reset === 'function') {
      await mgr.reset();
    }
  }

  // Domain-specific invalidation helpers
  async invalidateDashboard(): Promise<void> {
    await this.del('reports_dashboard');
  }

  async invalidateRooms(): Promise<void> {
    await this.del('room_types_all');
    await this.del('rooms_available');
  }

  async invalidateAllWrite(): Promise<void> {
    await this.invalidateDashboard();
    await this.invalidateRooms();
  }
}
