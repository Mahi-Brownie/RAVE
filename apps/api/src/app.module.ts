import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AppModuleCacheModule } from './cache/cache.module';
import { QueuesModule } from './queues/queues.module';
import { AuthModule } from './auth/auth.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { AiModule } from './ai/ai.module';
import { AnalysisModule } from './analysis/analysis.module';
import { FilesModule } from './files/files.module';
import { GitHubModule } from './github/github.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AppModuleCacheModule,
    QueuesModule,
    AuthModule,
    RepositoriesModule,
    AiModule,
    AnalysisModule,
    FilesModule,
    GitHubModule,
    HealthModule,
  ],
})
export class AppModule {}