import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisQueue } from '../queues/analysis.queue';
import { AnalysisTriggerDto } from './dto/analysis-trigger.dto';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { RepositoryResponseDto } from './dto/repository-response.dto';
import { UpdateRepositoryDto } from './dto/update-repository.dto';

type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const TIER_LIMITS: Record<string, number> = {
  anonymous: 1,
  free: 10,
  pro: Number.POSITIVE_INFINITY,
  enterprise: Number.POSITIVE_INFINITY,
};

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisQueue: AnalysisQueue,
  ) {}

  async create(user: any, dto: CreateRepositoryDto): Promise<RepositoryResponseDto> {
    try {
      await this.assertTierLimit(user);

      const parsed = this.parseGitHubUrl(dto.url);
      const existing = await this.prisma.repository.findUnique({
        where: { fullName: parsed.fullName },
      });

      if (existing) {
        throw new ConflictException(`Repository ${parsed.fullName} is already imported.`);
      }

      const repository = await this.prisma.repository.create({
        data: {
          name: dto.name?.trim() || parsed.name,
          fullName: parsed.fullName,
          url: parsed.url,
          importedById: user.id,
          status: 'pending',
        },
        include: {
          _count: {
            select: { analyses: true },
          },
        },
      });

      // Security scan would be performed here in production
      // await this.repoScannerService.scan(repository.id);

      this.logger.log(`Repository created: ${repository.id} by user ${user.id}`);
      return RepositoryResponseDto.fromEntity(repository);
    } catch (error) {
      this.handlePrismaErrors(error, 'Failed to create repository.');
    }
  }

  async findAll(user: any, query: PaginationQueryDto) {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const skip = (page - 1) * limit;

      const where: Prisma.RepositoryWhereInput = {
        importedById: user.id,
        ...(query.status ? { status: query.status } : {}),
      };

      const [total, repositories] = await this.prisma.$transaction([
        this.prisma.repository.count({ where }),
        this.prisma.repository.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [query.sort ?? 'updatedAt']: query.order ?? 'desc' },
          include: {
            _count: {
              select: { analyses: true },
            },
          },
        }),
      ]);

      return {
        data: repositories.map((repository) => RepositoryResponseDto.fromEntity(repository)),
        meta: this.buildPaginationMeta(total, page, limit),
      };
    } catch (error) {
      this.handlePrismaErrors(error, 'Failed to fetch repositories.');
    }
  }

  async findOne(user: any, repositoryId: string): Promise<RepositoryResponseDto> {
    try {
      const repository = await this.findOwnedRepositoryOrThrow(user.id, repositoryId);
      return RepositoryResponseDto.fromEntity(repository);
    } catch (error) {
      this.handlePrismaErrors(error, 'Failed to fetch repository.');
    }
  }

  async update(
    user: any,
    repositoryId: string,
    dto: UpdateRepositoryDto,
  ): Promise<RepositoryResponseDto> {
    try {
      await this.findOwnedRepositoryOrThrow(user.id, repositoryId);

      const data: Prisma.RepositoryUpdateInput = {};
      if (dto.name !== undefined) {
        data.name = dto.name.trim();
      }
      if (dto.defaultBranch !== undefined) {
        data.defaultBranch = dto.defaultBranch.trim();
      }

      if (Object.keys(data).length === 0) {
        throw new BadRequestException('At least one field (name/defaultBranch) must be provided.');
      }

      const repository = await this.prisma.repository.update({
        where: { id: repositoryId },
        data,
        include: {
          _count: {
            select: { analyses: true },
          },
        },
      });

      this.logger.log(`Repository updated: ${repositoryId} by user ${user.id}`);
      return RepositoryResponseDto.fromEntity(repository);
    } catch (error) {
      this.handlePrismaErrors(error, 'Failed to update repository.');
    }
  }

  async archive(user: any, repositoryId: string): Promise<void> {
    try {
      await this.findOwnedRepositoryOrThrow(user.id, repositoryId);

      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { status: 'archived' },
      });

      this.logger.log(`Repository archived: ${repositoryId} by user ${user.id}`);
    } catch (error) {
      this.handlePrismaErrors(error, 'Failed to archive repository.');
    }
  }

  async triggerAnalysis(user: any, repositoryId: string, dto: AnalysisTriggerDto) {
    try {
      await this.findOwnedRepositoryOrThrow(user.id, repositoryId);
      const uniqueTypes = [...new Set(dto.types)];

      const analyses = await this.prisma.$transaction(
        uniqueTypes.map((type) =>
          this.prisma.analysis.create({
            data: {
              repositoryId,
              type,
              status: 'queued',
            },
          }),
        ),
      );

      // Add jobs to queue using the AnalysisQueue service
      const queueJobIds: string[] = [];
      for (const analysis of analyses) {
        try {
          const queueJobId = await this.analysisQueue.addAnalysisJob(repositoryId, analysis.type);
          queueJobIds.push(queueJobId);
        } catch (queueError) {
          this.logger.warn(
            `Queue enqueue failed for analysis ${analysis.id}. Continuing with DB record only.`,
          );
          this.logger.debug(String(queueError));
        }
      }

      this.logger.log(
        `Analysis triggered for repository ${repositoryId}: ${analyses.length} jobs queued by user ${user.id}`,
      );

      return { 
        jobIds: analyses.map((analysis) => analysis.id),
        queueJobIds 
      };
    } catch (error) {
      this.handlePrismaErrors(error, 'Failed to trigger repository analysis.');
    }
  }

  async analysisStatus(user: any, repositoryId: string) {
    try {
      await this.findOwnedRepositoryOrThrow(user.id, repositoryId);

      const analyses = await this.prisma.analysis.findMany({
        where: { repositoryId },
        select: {
          id: true,
          type: true,
          status: true,
          progressPct: true,
          createdAt: true,
          completedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        analyses: analyses.map((analysis) => ({
          ...analysis,
          createdAt: analysis.createdAt.toISOString(),
          completedAt: analysis.completedAt ? analysis.completedAt.toISOString() : null,
        })),
      };
    } catch (error) {
      this.handlePrismaErrors(error, 'Failed to fetch analysis status.');
    }
  }

  private async findOwnedRepositoryOrThrow(userId: string, repositoryId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: {
        id: repositoryId,
        importedById: userId,
      },
      include: {
        _count: {
          select: { analyses: true },
        },
      },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found.');
    }

    return repository;
  }


  private async assertTierLimit(user: User): Promise<void> {
    const tierKey = user.tier.toLowerCase();
    const limit = TIER_LIMITS[tierKey] ?? TIER_LIMITS.anonymous;

    if (!Number.isFinite(limit)) {
      return;
    }

    const currentCount = await this.prisma.repository.count({
      where: {
        importedById: user.id,
        status: {
          not: 'archived',
        },
      },
    });

    if (currentCount >= limit) {
      throw new ForbiddenException(
        `Repository tier limit reached for ${tierKey}. Maximum allowed: ${limit}.`,
      );
    }
  }

  private buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPages,
    };
  }

  private parseGitHubUrl(rawUrl: string) {
    const normalizedUrl = rawUrl.match(/^https?:\/\//i) ? rawUrl : `https://${rawUrl}`;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      throw new BadRequestException('Invalid repository URL.');
    }

    if (!['github.com', 'www.github.com'].includes(parsedUrl.hostname.toLowerCase())) {
      throw new BadRequestException('Only github.com repository URLs are supported.');
    }

    const pathParts = parsedUrl.pathname
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);

    if (pathParts.length < 2) {
      throw new BadRequestException('Repository URL must include owner and repository name.');
    }

    const owner = pathParts[0];
    const repositoryName = pathParts[1].replace(/\.git$/i, '');

    if (!owner || !repositoryName) {
      throw new BadRequestException('Repository URL must include owner and repository name.');
    }

    const fullName = `${owner}/${repositoryName}`;

    return {
      fullName,
      name: repositoryName,
      url: `https://github.com/${fullName}`,
    };
  }

  private handlePrismaErrors(error: unknown, fallbackMessage: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof ForbiddenException ||
      error instanceof ConflictException
    ) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('A repository with the same unique value already exists.');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Requested repository was not found.');
      }
    }

    throw new BadRequestException(fallbackMessage);
  }
}
