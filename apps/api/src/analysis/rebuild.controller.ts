import { Controller, Get, Param, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RebuildGuideService } from './rebuild-guide.service';

@Controller('repositories')
@UseGuards(AuthGuard)
export class RebuildController {
  constructor(private readonly rebuildGuideService: RebuildGuideService) {}

  @Get(':id/rebuild-steps')
  async getRebuildSteps(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
    @Query('complexity') complexity?: string,
  ): Promise<{
    repositoryId: string;
    complexity: number;
    totalSteps: number;
    steps: import('./rebuild-guide.service').RebuildStep[];
    generatedAt: string;
  }> {
    const complexityNum = complexity ? parseInt(complexity, 10) : 2;
    
    if (complexityNum < 1 || complexityNum > 3) {
      throw new HttpException('Complexity must be between 1 and 3', HttpStatus.BAD_REQUEST);
    }

    try {
      const guide = await this.rebuildGuideService.getRebuildGuide(repositoryId, complexityNum);
      
      return {
        repositoryId,
        complexity: complexityNum,
        totalSteps: guide.totalSteps,
        steps: guide.steps,
        generatedAt: guide.generatedAt,
      };
    } catch (error) {
      if (error.message.includes('Repository not found')) {
        throw new HttpException('Repository not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Failed to generate rebuild guide', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/rebuild-steps/:stepNumber')
  async getRebuildStep(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
    @Param('stepNumber') stepNumber: string,
    @Query('complexity') complexity?: string,
  ): Promise<{
    repositoryId: string;
    complexity: number;
    stepNumber: number;
    step: import('./rebuild-guide.service').RebuildStep;
  }> {
    const stepNum = parseInt(stepNumber, 10);
    const complexityNum = complexity ? parseInt(complexity, 10) : 2;
    
    if (stepNum < 1) {
      throw new HttpException('Step number must be greater than 0', HttpStatus.BAD_REQUEST);
    }
    
    if (complexityNum < 1 || complexityNum > 3) {
      throw new HttpException('Complexity must be between 1 and 3', HttpStatus.BAD_REQUEST);
    }

    try {
      const step = await this.rebuildGuideService.getStep(repositoryId, complexityNum, stepNum);
      
      if (!step) {
        throw new HttpException('Step not found', HttpStatus.NOT_FOUND);
      }

      return {
        repositoryId,
        complexity: complexityNum,
        stepNumber: stepNum,
        step,
      };
    } catch (error) {
      if (error.message.includes('Repository not found')) {
        throw new HttpException('Repository not found', HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('Step not found')) {
        throw new HttpException('Step not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Failed to get rebuild step', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/rebuild-steps/progress')
  async getRebuildProgress(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
    @Query('complexity') complexity?: string,
  ): Promise<{
    repositoryId: string;
    complexity: number;
    totalSteps: number;
    completedSteps: number;
    progressPercentage: number;
    status: string;
    lastAccessed?: string;
  }> {
    const complexityNum = complexity ? parseInt(complexity, 10) : 2;
    
    if (complexityNum < 1 || complexityNum > 3) {
      throw new HttpException('Complexity must be between 1 and 3', HttpStatus.BAD_REQUEST);
    }

    try {
      const guides = await this.rebuildGuideService.listRebuildGuides(repositoryId);
      const guide = guides.find(g => g.complexity === complexityNum);
      
      if (!guide) {
        return {
          repositoryId,
          complexity: complexityNum,
          totalSteps: 0,
          completedSteps: 0,
          progressPercentage: 0,
          status: 'not_started',
        };
      }

      // For now, we'll return a placeholder progress
      // In a real implementation, you'd track user progress
      return {
        repositoryId,
        complexity: complexityNum,
        totalSteps: guide.totalSteps,
        completedSteps: 0, // Placeholder - would come from user progress tracking
        progressPercentage: 0,
        status: 'in_progress',
        lastAccessed: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException('Failed to get rebuild progress', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/rebuild-guides')
  async listRebuildGuides(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
  ): Promise<{
    repositoryId: string;
    guides: Array<{
      complexity: number;
      totalSteps: number;
      createdAt: Date;
    }>;
    total: number;
  }> {
    try {
      const guides = await this.rebuildGuideService.listRebuildGuides(repositoryId);
      
      return {
        repositoryId,
        guides,
        total: guides.length,
      };
    } catch (error) {
      throw new HttpException('Failed to list rebuild guides', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/rebuild-guides/invalidate')
  async invalidateRebuildCache(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
  ): Promise<{
    message: string;
    repositoryId: string;
    timestamp: string;
  }> {
    try {
      await this.rebuildGuideService.invalidateCache(repositoryId);
      
      return {
        message: 'Rebuild guide cache invalidated successfully',
        repositoryId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException('Failed to invalidate rebuild cache', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
