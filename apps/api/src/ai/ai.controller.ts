import { Controller, Get, Param, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiService } from './ai.service';

@Controller('repositories')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get(':id/explain')
  async explainCode(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
    @Query('file') filePath: string,
    @Query('depth') depth?: string,
  ) {
    if (!filePath) {
      throw new HttpException('File parameter is required', HttpStatus.BAD_REQUEST);
    }

    const depthNum = depth ? parseInt(depth, 10) : 3;
    
    if (depthNum < 1 || depthNum > 5) {
      throw new HttpException('Depth must be between 1 and 5', HttpStatus.BAD_REQUEST);
    }

    try {
      const explanation = await this.aiService.retryWithBackoff(
        () => this.aiService.getExplanation(repositoryId, filePath, depthNum),
        3,
      );

      return {
        repositoryId,
        filePath,
        depth: depthNum,
        explanation,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error.message.includes('AI service temporarily unavailable')) {
        throw new HttpException('AI service temporarily unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }
      if (error.message.includes('File not found')) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Failed to generate explanation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/explanations')
  async listExplanations(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
  ) {
    try {
      const explanations = await this.aiService.listExplanations(repositoryId);
      
      return {
        repositoryId,
        explanations,
        total: explanations.length,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch explanations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/explain/cache-status')
  async getCacheStatus(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
    @Query('file') filePath: string,
    @Query('depth') depth?: string,
  ) {
    if (!filePath) {
      throw new HttpException('File parameter is required', HttpStatus.BAD_REQUEST);
    }

    const depthNum = depth ? parseInt(depth, 10) : 3;
    
    // This would require extending the AiService to check cache status
    // For now, return a placeholder response
    return {
      repositoryId,
      filePath,
      depth: depthNum,
      cached: false, // Placeholder
      message: 'Cache status check not implemented yet',
    };
  }

  @Get('ai/circuit-breaker')
  async getCircuitBreakerStatus() {
    try {
      return await this.aiService.getCircuitBreakerStatus();
    } catch (error) {
      throw new HttpException('Failed to get circuit breaker status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('ai/circuit-breaker/reset')
  async resetCircuitBreaker() {
    try {
      await this.aiService.resetCircuitBreaker();
      return {
        message: 'Circuit breaker reset successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException('Failed to reset circuit breaker', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
