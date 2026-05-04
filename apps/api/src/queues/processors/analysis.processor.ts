import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { GitHubService } from '../../github/github.service';
import { DependencyGraphService } from '../../analysis/dependency-graph.service';
import { AnalysisJobData } from '../analysis.queue';

@Processor('analysis')
export class AnalysisProcessor {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GitHubService,
    private readonly dependencyGraphService: DependencyGraphService,
  ) {}

  @Process('run-analysis')
  async handleAnalysisJob(job: Job<AnalysisJobData>) {
    const { analysisId, repositoryId, type } = job.data;
    
    this.logger.log(`Starting analysis job ${job.id}: ${analysisId}, type: ${type}`);

    try {
      // Validate sandbox policy before executing analysis
      // await this.sandboxService.validatePolicy(repositoryId);

      // Update analysis status to processing
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'processing',
          progressPct: 0,
        },
      });

      // Update job progress
      job.progress(10);

      // Placeholder logic for different analysis types
      await this.performAnalysis(type, job);

      // Mark as completed
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'completed',
          progressPct: 100,
          completedAt: new Date(),
        },
      });

      job.progress(100);
      this.logger.log(`Completed analysis job ${job.id}: ${analysisId}`);

    } catch (error) {
      this.logger.error(`Failed analysis job ${job.id}: ${error.message}`);
      
      // Mark as failed
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });

      throw error; // Re-throw to let Bull handle retries
    }
  }

  private async performAnalysis(type: string, job: Job<AnalysisJobData>): Promise<void> {
    const { repositoryId, analysisId } = job.data;
    
    // Check if repository needs to be cloned first
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new Error('Repository not found');
    }

    // Clone repository if not already cloned
    if (repository.status === 'pending') {
      this.logger.log(`Cloning repository ${repositoryId} before analysis`);
      await this.githubService.cloneRepository(repository.url, repositoryId);
      
      // Update repository status to analyzing
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { status: 'analyzing' },
      });
    }

    // Perform the actual analysis
    this.logger.log(`Performing ${type} analysis for job ${job.id}`);

    switch (type) {
      case 'clone':
        // Repository already cloned above
        break;
      case 'security':
        await this.simulateWork('security scan', job, 30, 70);
        break;
      case 'performance':
        await this.simulateWork('performance analysis', job, 20, 80);
        break;
      case 'code-quality':
        await this.simulateWork('code quality check', job, 40, 60);
        break;
      case 'dependencies':
        await this.simulateWork('dependency analysis', job, 10, 90);
        break;
      case 'dependency_graph':
        await this.performDependencyGraphAnalysis(repositoryId, analysisId, job);
        break;
      default:
        await this.simulateWork('general analysis', job, 25, 75);
        break;
    }

    // Update repository status to analyzed if this is the last analysis
    const pendingAnalyses = await this.prisma.analysis.count({
      where: {
        repositoryId,
        status: { in: ['queued', 'processing'] },
      },
    });

    if (pendingAnalyses === 0) {
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { status: 'analyzed' },
      });
      this.logger.log(`Repository ${repositoryId} analysis completed`);
    }
  }

  private async performDependencyGraphAnalysis(
    repositoryId: string,
    analysisId: string,
    job: Job<AnalysisJobData>,
  ): Promise<void> {
    this.logger.log(`Starting dependency graph analysis for repository ${repositoryId}`);
    
    try {
      // Update progress
      job.progress(20);
      
      // Generate dependency graph
      const graph = await this.dependencyGraphService.generateDependencyGraph(repositoryId);
      
      job.progress(80);
      
      // Store result in analysis
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          resultJson: graph as any,
        },
      });
      
      job.progress(100);
      
      this.logger.log(`Completed dependency graph analysis: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
      
    } catch (error) {
      this.logger.error(`Failed to generate dependency graph: ${error.message}`);
      throw error;
    }
  }

  private async simulateWork(
    taskName: string,
    job: Job<AnalysisJobData>,
    startProgress: number,
    endProgress: number,
  ): Promise<void> {
    this.logger.log(`Starting ${taskName} for job ${job.id}`);
    
    // Update progress to start point
    job.progress(startProgress);
    
    // Simulate work with 2 second delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update progress to end point
    job.progress(endProgress);
    
    this.logger.log(`Completed ${taskName} for job ${job.id}`);
  }
}
