import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DependencyGraphService } from './dependency-graph.service';

@Controller('repositories')
@UseGuards(AuthGuard)
export class DependencyController {
  constructor(private readonly dependencyGraphService: DependencyGraphService) {}

  @Get(':id/dependencies')
  async getDependencyGraph(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
    @Query('depth') depth?: string,
  ): Promise<import('./dependency-graph.service').DependencyGraph> {
    const depthNum = depth ? parseInt(depth, 10) : undefined;
    
    // For now, we don't limit depth in the service, but we could implement it
    const graph = await this.dependencyGraphService.generateDependencyGraph(repositoryId);
    
    // If depth is specified, we could filter the graph here
    // For simplicity, we return the full graph
    return graph;
  }

  @Get(':id/dependencies/cached')
  async getCachedDependencyGraph(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
  ): Promise<import('./dependency-graph.service').DependencyGraph | { message: string; graph: null }> {
    const graph = await this.dependencyGraphService.getCachedGraph(repositoryId);
    
    if (!graph) {
      return {
        message: 'No cached dependency graph found. Generate one first.',
        graph: null,
      };
    }
    
    return graph;
  }

  @Get(':id/dependencies/invalidate')
  async invalidateDependencyCache(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
  ): Promise<{ message: string }> {
    await this.dependencyGraphService.invalidateCache(repositoryId);
    
    return {
      message: 'Dependency graph cache invalidated successfully',
    };
  }

  @Get(':id/dependencies/stats')
  async getDependencyStats(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
  ): Promise<{
    nodes: {
      total: number;
      files: number;
      packages: number;
      external: number;
    };
    edges: {
      total: number;
      imports: number;
      exports: number;
      requires: number;
    };
    languages: Record<string, number>;
  }> {
    const graph = await this.dependencyGraphService.generateDependencyGraph(repositoryId);
    
    // Calculate additional statistics
    const fileNodes = graph.nodes.filter(node => node.type === 'file');
    const packageNodes = graph.nodes.filter(node => node.type === 'package');
    const externalNodes = graph.nodes.filter(node => node.type === 'external');
    
    const importEdges = graph.edges.filter(edge => edge.type === 'import');
    const exportEdges = graph.edges.filter(edge => edge.type === 'export');
    const requireEdges = graph.edges.filter(edge => edge.type === 'require');
    
    // Language distribution
    const languageStats = fileNodes.reduce((acc, node) => {
      const lang = node.data?.language || 'unknown';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      nodes: {
        total: graph.nodes.length,
        files: fileNodes.length,
        packages: packageNodes.length,
        external: externalNodes.length,
      },
      edges: {
        total: graph.edges.length,
        imports: importEdges.length,
        exports: exportEdges.length,
        requires: requireEdges.length,
      },
      languages: languageStats,
    };
  }
}
