import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DependencyGraphService } from './dependency-graph.service';
import { AiService } from '../ai/ai.service';

export interface RebuildStep {
  order: number;
  title: string;
  description: string;
  filePath: string;
  dependencies: string[];
  codeTemplate: string;
  explanation: string;
  whyThisMatters: string;
}

interface RebuildGuide {
  repositoryId: string;
  complexity: number;
  totalSteps: number;
  steps: RebuildStep[];
  generatedAt: string;
}

@Injectable()
export class RebuildGuideService {
  private readonly logger = new Logger(RebuildGuideService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dependencyGraphService: DependencyGraphService,
    private readonly aiService: AiService,
  ) {}

  async generateRebuildGuide(repositoryId: string, complexity: number): Promise<RebuildGuide> {
    if (complexity < 1 || complexity > 3) {
      throw new Error('Complexity must be between 1 and 3');
    }

    const cacheKey = `rebuild:${repositoryId}:complexity:${complexity}`;
    
    // Check cache first - cache not available in current setup
    // const cached = await this.cacheManager.get<RebuildGuide>(cacheKey);
    // if (cached) {
    //   this.logger.log(`Returning cached rebuild guide for repository ${repositoryId}, complexity ${complexity}`);
    //   return cached;
    // }

    // Check database first
    const existing = await (this.prisma as any).rebuildGuide.findFirst({
      where: {
        repositoryId,
        complexity,
      },
    });

    if (existing) {
      const guide = {
        repositoryId,
        complexity,
        totalSteps: existing.totalSteps,
        steps: existing.stepsJson as unknown as RebuildStep[],
        generatedAt: existing.createdAt.toISOString(),
      };
      
      // Cache it for faster access if cache is available
      // await this.cacheManager.set(cacheKey, guide, 3600); // 1 hour
      return guide;
    }

    this.logger.log(`Generating rebuild guide for repository ${repositoryId}, complexity ${complexity}`);

    // Get dependency graph
    const dependencyGraph = await this.dependencyGraphService.generateDependencyGraph(repositoryId);
    
    // Get repository files
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new Error('Repository not found');
    }

    // Get files separately
    const files = await (this.prisma as any).projectFile.findMany({
      where: { repositoryId },
      select: { path: true, content: true },
      orderBy: { path: 'asc' },
    });

    // Perform topological sort
    const sortedFiles = this.topologicalSort(dependencyGraph, files);
    
    // Generate steps based on complexity
    const steps = await this.generateSteps(sortedFiles, files, complexity);
    
    const guide: RebuildGuide = {
      repositoryId,
      complexity,
      totalSteps: steps.length,
      steps,
      generatedAt: new Date().toISOString(),
    };

    // Store in database
    await (this.prisma as any).rebuildGuide.create({
      data: {
        repositoryId,
        complexity,
        totalSteps: steps.length,
        stepsJson: steps as any,
      },
    });

    // Cache the result if cache is available
    // await this.cacheManager.set(cacheKey, guide, 3600); // 1 hour

    this.logger.log(`Generated rebuild guide: ${steps.length} steps for complexity ${complexity}`);
    
    return guide;
  }

  private topologicalSort(
    dependencyGraph: any,
    files: Array<{ path: string; content: string }>,
  ): Array<{ path: string; content: string; dependencies: string[] }> {
    // Build adjacency list
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const fileMap = new Map<string, { path: string; content: string }>();

    // Initialize
    files.forEach(file => {
      const nodeId = `file:${file.path}`;
      adjList.set(nodeId, []);
      inDegree.set(nodeId, 0);
      fileMap.set(nodeId, file);
    });

    // Build dependency relationships
    dependencyGraph.edges.forEach((edge: any) => {
      if (edge.source.startsWith('file:') && edge.target.startsWith('file:')) {
        adjList.get(edge.target)?.push(edge.source);
        inDegree.set(edge.source, (inDegree.get(edge.source) || 0) + 1);
      }
    });

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    const result: Array<{ path: string; content: string; dependencies: string[] }> = [];

    // Find nodes with no incoming edges
    inDegree.forEach((degree, node) => {
      if (degree === 0) {
        queue.push(node);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      const file = fileMap.get(current);
      
      if (file) {
        const dependencies = adjList.get(current) || [];
        const dependencyPaths = dependencies
          .map(dep => fileMap.get(dep))
          .filter(Boolean)
          .map(f => f!.path);

        result.push({
          path: file.path,
          content: file.content,
          dependencies: dependencyPaths,
        });
      }

      // Process neighbors
      adjList.get(current)?.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    // If we have a cycle, add remaining files
    if (result.length < files.length) {
      this.logger.warn('Dependency cycle detected, adding remaining files');
      files.forEach(file => {
        const nodeId = `file:${file.path}`;
        if (!result.find(r => r.path === file.path)) {
          result.push({
            path: file.path,
            content: file.content,
            dependencies: [],
          });
        }
      });
    }

    return result;
  }

  private async generateSteps(
    sortedFiles: Array<{ path: string; content: string; dependencies: string[] }>,
    allFiles: Array<{ path: string; content: string }>,
    complexity: number,
  ): Promise<RebuildStep[]> {
    const stepCounts = {
      1: Math.min(8, sortedFiles.length), // 5-10 steps
      2: Math.min(20, sortedFiles.length), // 15-25 steps  
      3: sortedFiles.length, // 30+ steps (all files)
    };

    const targetStepCount = stepCounts[complexity] || sortedFiles.length;
    const stepSize = Math.ceil(sortedFiles.length / targetStepCount);
    
    const steps: RebuildStep[] = [];

    for (let i = 0; i < sortedFiles.length; i += stepSize) {
      const batch = sortedFiles.slice(i, i + stepSize);
      
      if (complexity === 1 && batch.length > 1) {
        // Group related files for complexity 1
        const step = await this.createGroupedStep(batch, allFiles, i / stepSize + 1);
        steps.push(step);
      } else {
        // Individual files for complexity 2 and 3
        for (const file of batch) {
          const step = await this.createIndividualStep(file, allFiles, steps.length + 1, complexity);
          steps.push(step);
        }
      }
    }

    return steps;
  }

  private async createGroupedStep(
    files: Array<{ path: string; content: string; dependencies: string[] }>,
    allFiles: Array<{ path: string; content: string }>,
    order: number,
  ): Promise<RebuildStep> {
    const mainFile = files[0];
    const groupedContent = files.map(f => `// File: ${f.path}\n${f.content}`).join('\n\n');
    const allDependencies = [...new Set(files.flatMap(f => f.dependencies))];
    
    const title = this.generateStepTitle(files, 1);
    const description = `Create and configure ${files.length} related files: ${files.map(f => f.path).join(', ')}`;
    
    const explanation = await this.generateExplanation(groupedContent, 1, 'group');
    
    return {
      order,
      title,
      description,
      filePath: mainFile.path,
      dependencies: allDependencies,
      codeTemplate: this.generateCodeTemplate(files, 1),
      explanation,
      whyThisMatters: `These files form the foundation for your project structure and basic functionality.`,
    };
  }

  private async createIndividualStep(
    file: { path: string; content: string; dependencies: string[] },
    allFiles: Array<{ path: string; content: string }>,
    order: number,
    complexity: number,
  ): Promise<RebuildStep> {
    const title = this.generateStepTitle([file], complexity);
    const description = `Create ${file.path} with proper implementation`;
    
    const explanation = await this.generateExplanation(file.content, complexity, 'individual');
    
    return {
      order,
      title,
      description,
      filePath: file.path,
      dependencies: file.dependencies,
      codeTemplate: this.generateCodeTemplate([file], complexity),
      explanation,
      whyThisMatters: this.generateWhyThisMatters(file, complexity),
    };
  }

  private generateStepTitle(files: Array<{ path: string }>, complexity: number): string {
    if (files.length === 1) {
      const file = files[0];
      const fileName = file.path.split('/').pop() || file.path;
      
      if (complexity === 1) {
        return `Create ${fileName}`;
      } else if (complexity === 2) {
        return `Implement ${fileName}`;
      } else {
        return `Build ${fileName} - Complete Implementation`;
      }
    } else {
      const fileTypes = files.map(f => f.path.split('.').pop()).filter(Boolean);
      const uniqueTypes = [...new Set(fileTypes)];
      
      if (uniqueTypes.length === 1) {
        return `Create ${uniqueTypes[0]} Files`;
      } else {
        return `Create Core Files`;
      }
    }
  }

  private generateCodeTemplate(files: Array<{ path: string; content: string }>, complexity: number): string {
    if (complexity === 1) {
      // Pseudocode only
      return files.map(f => {
        const fileName = f.path.split('/').pop() || f.path;
        const lines = f.content.split('\n').slice(0, 5).map(line => `// ${line}`).join('\n');
        return `// ${fileName}\n${lines}\n// ... rest of implementation`;
      }).join('\n\n');
    } else if (complexity === 2) {
      // Real code snippets (shortened)
      return files.map(f => {
        const lines = f.content.split('\n');
        const snippet = lines.slice(0, Math.min(10, lines.length)).join('\n');
        return snippet + (lines.length > 10 ? '\n// ... rest of code' : '');
      }).join('\n\n');
    } else {
      // Full code
      return files.map(f => f.content).join('\n\n');
    }
  }

  private async generateExplanation(content: string, complexity: number, type: 'group' | 'individual'): Promise<string> {
    const depth = complexity === 1 ? 1 : complexity === 2 ? 2 : 3;
    const language = this.detectLanguage(content);
    
    let prompt: string;
    if (type === 'group') {
      prompt = `Explain this group of ${language} files simply in 2-3 sentences for a beginner. Focus on how they work together.\n\nCode:\n${content}`;
    } else {
      prompt = `Explain this ${language} code${complexity === 3 ? ' in detail, including architecture and best practices' : complexity === 2 ? ' function by function' : ' simply in 2-3 sentences'}.\n\nCode:\n${content}`;
    }

    try {
      return await this.aiService.retryWithBackoff(
        () => this.aiService.explainCode(content, { depth, language }),
        2,
      );
    } catch (error) {
      this.logger.warn(`Failed to generate AI explanation: ${error.message}`);
      return `This ${language} code implements core functionality for the project. ${complexity === 3 ? 'The code follows best practices and includes proper error handling.' : ''}`;
    }
  }

  private generateWhyThisMatters(file: { path: string; content: string }, complexity: number): string {
    const fileName = file.path.split('/').pop() || file.path;
    const extension = file.path.split('.').pop()?.toLowerCase();
    
    const reasons: Record<string, string> = {
      'ts': 'TypeScript provides type safety and better development experience.',
      'js': 'JavaScript handles the core logic and user interactions.',
      'tsx': 'React component with TypeScript for type-safe UI development.',
      'jsx': 'React component for building user interfaces.',
      'py': 'Python handles backend logic and data processing.',
      'go': 'Go provides high-performance backend services.',
      'rs': 'Rust ensures memory safety and performance.',
      'java': 'Java provides enterprise-grade reliability and scalability.',
      'cpp': 'C++ offers high-performance system-level programming.',
      'html': 'HTML defines the structure and content of web pages.',
      'css': 'CSS styles the visual appearance and layout.',
      'json': 'JSON configuration file for project settings.',
      'md': 'Markdown documentation for project information.',
    };

    const baseReason = reasons[extension || ''] || 'This file contains important project functionality.';
    
    if (complexity === 3) {
      return `${baseReason} It follows established patterns and includes proper error handling, testing considerations, and performance optimizations.`;
    } else if (complexity === 2) {
      return `${baseReason} It implements key features and follows best practices for maintainability.`;
    } else {
      return baseReason;
    }
  }

  private detectLanguage(content: string): string {
    // Simple language detection based on content
    if (content.includes('import ') && content.includes('export ')) {
      return 'TypeScript';
    } else if (content.includes('import ') || content.includes('require(')) {
      return 'JavaScript';
    } else if (content.includes('def ') && content.includes(':')) {
      return 'Python';
    } else if (content.includes('package ') && content.includes('import ')) {
      return 'Go';
    } else if (content.includes('fn ') && content.includes('->')) {
      return 'Rust';
    } else if (content.includes('public class ')) {
      return 'Java';
    } else if (content.includes('#include')) {
      return 'C++';
    } else if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      return 'HTML';
    } else if (content.includes('{') && content.includes('}')) {
      return 'CSS';
    } else {
      return 'Unknown';
    }
  }

  async getRebuildGuide(repositoryId: string, complexity: number): Promise<RebuildGuide> {
    return this.generateRebuildGuide(repositoryId, complexity);
  }

  async getStep(
    repositoryId: string,
    complexity: number,
    stepNumber: number,
  ): Promise<RebuildStep | null> {
    const guide = await this.generateRebuildGuide(repositoryId, complexity);
    
    if (stepNumber < 1 || stepNumber > guide.steps.length) {
      return null;
    }
    
    return guide.steps[stepNumber - 1];
  }

  async listRebuildGuides(repositoryId: string): Promise<Array<{
    complexity: number;
    totalSteps: number;
    createdAt: Date;
  }>> {
    const guides = await (this.prisma as any).rebuildGuide.findMany({
      where: { repositoryId },
      select: {
        complexity: true,
        totalSteps: true,
        createdAt: true,
      },
      orderBy: { complexity: 'asc' },
    });

    return guides;
  }

  async invalidateCache(repositoryId: string): Promise<void> {
    // Cache invalidation would require cache manager
    this.logger.log(`Cache invalidation requested for repository ${repositoryId}`);
  }
}
