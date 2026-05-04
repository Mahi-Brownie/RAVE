import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { AnalysisProcessor } from './processors/analysis.processor';
import { AnalysisQueue } from './analysis.queue';

@Module({
  imports: [
    RedisModule,
    BullModule.registerQueue({
      name: 'analysis',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
  ],
  providers: [AnalysisQueue, AnalysisProcessor],
  exports: [AnalysisQueue],
})
export class QueuesModule {}
