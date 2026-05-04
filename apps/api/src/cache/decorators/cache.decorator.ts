import { Inject } from '@nestjs/common';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
  UseInterceptors,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_SKIP_KEY = 'cache_skip';

export function CacheResponse(ttl?: number) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_TTL_KEY, ttl || 300)(target, propertyKey, descriptor);
    UseInterceptors(CacheInterceptor)(target, propertyKey, descriptor);
  };
}

export function SkipCache() {
  return SetMetadata(CACHE_SKIP_KEY, true);
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const skipCache = this.reflector.get<boolean>(CACHE_SKIP_KEY, context.getHandler());
    const customTtl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler());

    // Skip caching for authenticated routes (user-specific data)
    if (skipCache || request.user) {
      return next.handle();
    }

    // Generate cache key based on controller, method, and request params
    const controller = context.getClass().name;
    const method = context.getHandler().name;
    const params = JSON.stringify(request.params || {});
    const query = JSON.stringify(request.query || {});
    const cacheKey = `cache:${controller.toLowerCase()}:${method.toLowerCase()}:${params}:${query}`;

    try {
      // Try to get from cache
      const cachedValue = await this.cacheManager.get(cacheKey);
      if (cachedValue !== undefined && cachedValue !== null) {
        return of(cachedValue);
      }
    } catch (error) {
      // Cache miss or error, continue with request
    }

    // Execute request and cache response
    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.cacheManager.set(cacheKey, response, customTtl || 300);
        } catch (error) {
          // Cache set error, ignore
        }
      }),
    );
  }
}
