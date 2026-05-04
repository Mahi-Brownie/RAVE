import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { Inject } from '@nestjs/common';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: any,
  ) {}

  async checkDatabase(): Promise<{ status: string; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      return { status: 'ok', latency };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkRedis(): Promise<{ status: string; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.redis.ping();
      const latency = Date.now() - start;
      return { status: 'ok', latency };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkAll() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const isHealthy = database.status === 'ok' && redis.status === 'ok';
    const uptime = process.uptime();

    return {
      status: isHealthy ? 'ok' : 'degraded',
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
      services: {
        database,
        redis,
      },
    };
  }
}