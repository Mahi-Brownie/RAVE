import { Module } from '@nestjs/common';
import { DependencyController } from './dependency.controller';
import { RebuildController } from './rebuild.controller';
import { DependencyGraphService } from './dependency-graph.service';
import { RebuildGuideService } from './rebuild-guide.service';

@Module({
  controllers: [DependencyController, RebuildController],
  providers: [DependencyGraphService, RebuildGuideService],
  exports: [DependencyGraphService, RebuildGuideService],
})
export class AnalysisModule {}
