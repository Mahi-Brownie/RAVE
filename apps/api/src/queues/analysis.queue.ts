import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';

export interface AnalysisJobData {
  analysisId: string;
  repositoryId: string;
  type: string;
}

@Injectable()
export class AnalysisQueue {
  private readonly logger = new Logger(AnalysisQueue.name);

  constructor(
    @InjectQueue('analysis') private readonly analysisQueue: Queue<AnalysisJobData>,
    private readonly prisma: PrismaService,
  ) {}

  async addAnalysisJob(repositoryId: string, type: string): Promise<string> {
    try {
      // Get repository with user to determine priority
      const repository = await this.prisma.repository.findUnique({
        where: { id: repositoryId },
        include: { importedBy: true },
      });

      if (!repository) {
        throw new Error('Repository not found');
      }

      // Create analysis record first
      const analysis = await this.prisma.analysis.create({
        data: {
          repositoryId,
          type,
          status: 'queued',
        },
      });

      // Determine priority based on user tier
      const priority = this.getPriorityByTier(repository.importedBy.tier);

      // Add job to queue
      const job = await this.analysisQueue.add(
        'run-analysis',
        {
          analysisId: analysis.id,
          repositoryId,
          type,
        },
        {
          priority,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.log(
        `Added analysis job ${job.id} for repository ${repositoryId}, type: ${type}, priority: ${priority}`,
      );

      return job.id.toString();
    } catch (error) {
      this.logger.error(`Failed to add analysis job: ${error.message}`);
      throw error;
    }
  }

  private getPriorityByTier(tier: string): number {
    switch (tier.toLowerCase()) {
      case 'pro':
      case 'enterprise':
        return 1; // High priority
      case 'free':
        return 10; // Lower priority
      default:
        return 15; // Lowest priority
    }
  }

  async getJobStatus(jobId: string): Promise<any> {
    try {
      const job = await this.analysisQueue.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }
      return {
        id: job.id,
        status: await job.getState(),
        progress: job.progress(),
        data: job.data,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status: ${error.message}`);
      throw error;
    }
  }

  async getQueueStats(): Promise<any> {
    try {
      const waiting = await this.analysisQueue.getWaiting();
      const active = await this.analysisQueue.getActive();
      const completed = await this.analysisQueue.getCompleted();
      const failed = await this.analysisQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      throw error;
    }
  }
}
