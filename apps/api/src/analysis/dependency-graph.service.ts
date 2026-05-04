import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface DependencyGraph {
  nodes: any[];
  edges: any[];
}

interface DependencyNode {
  id: string;
  label: string;
  type: 'file' | 'package' | 'external';
  data?: {
    path?: string;
    language?: string;
    size?: number;
  };
}

interface DependencyEdge {
  source: string;
  target: string;
  type: 'import' | 'export' | 'require';
  data?: {
    line?: number;
    alias?: string;
  };
}

@Injectable()
export class DependencyGraphService {
  private readonly logger = new Logger(DependencyGraphService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async generateDependencyGraph(repositoryId: string): Promise<DependencyGraph> {
    const cacheKey = `dependency:graph:${repositoryId}`;
    
    // Try to get from cache first
    const cached = await this.cacheManager.get<DependencyGraph>(cacheKey);
    if (cached) {
      this.logger.log(`Returning cached dependency graph for repository ${repositoryId}`);
      return cached;
    }

    this.logger.log(`Generating dependency graph for repository ${repositoryId}`);

    // Get all files from repository
    const files = await (this.prisma as any).projectFile.findMany({
      where: { repositoryId },
      select: { path: true, content: true, sizeBytes: true },
    });

    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];
    const nodeMap = new Map<string, DependencyNode>();

    // Process each file for dependencies
    for (const file of files) {
      const language = this.detectLanguage(file.path);
      const nodeId = `file:${file.path}`;
      
      // Create node for this file
      const node: DependencyNode = {
        id: nodeId,
        label: file.path.split('/').pop() || file.path,
        type: 'file',
        data: {
          path: file.path,
          language,
          size: file.sizeBytes,
        },
      };
      
      nodes.push(node);
      nodeMap.set(nodeId, node);

      // Parse dependencies based on language
      const dependencies = this.parseDependencies(file.content, language);
      
      for (const dep of dependencies) {
        const targetNodeId = this.resolveDependencyTarget(dep, files, repositoryId);
        
        if (targetNodeId) {
          const edge: DependencyEdge = {
            source: nodeId,
            target: targetNodeId,
            type: dep.type,
            data: {
              line: dep.line,
              alias: dep.alias,
            },
          };
          
          edges.push(edge);
        }
      }
    }

    const graph: DependencyGraph = {
      nodes,
      edges,
    };

    // Cache the result for 1 hour
    await this.cacheManager.set(cacheKey, graph, 3600);
    
    this.logger.log(`Generated dependency graph: ${nodes.length} nodes, ${edges.length} edges`);
    
    return graph;
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
    };

    return languageMap[ext || ''] || 'unknown';
  }

  private parseDependencies(content: string, language: string): Array<{
    target: string;
    type: 'import' | 'export' | 'require';
    line: number;
    alias?: string;
  }> {
    const dependencies = [] as any;
    const lines = content.split('\n');

    switch (language) {
      case 'typescript':
      case 'javascript':
        dependencies.push(...this.parseJavaScriptDependencies(lines));
        break;
      case 'python':
        dependencies.push(...this.parsePythonDependencies(lines));
        break;
      case 'go':
        dependencies.push(...this.parseGoDependencies(lines));
        break;
      case 'rust':
        dependencies.push(...this.parseRustDependencies(lines));
        break;
    }

    return dependencies;
  }

  private parseJavaScriptDependencies(lines: string[]): Array<{
    target: string;
    type: 'import' | 'export' | 'require';
    line: number;
    alias?: string;
  }> {
    const dependencies = [] as any;
    const importRegex = /import\s+(?:(?:\*\s+as\s+([^;]+))|(?:[^{}\s]+(?:\s+as\s+([^;]+))?)|(?:{([^}]+)})\s+from\s+['"`]([^'"`]+)['"`])/g;
    const requireRegex = /(?:const|let|var)\s+(?:[^=]+)\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    const exportRegex = /export\s+(?:{([^}]+)}|(?:default|[^{}\s]+))\s+from\s+['"`]([^'"`]+)['"`]/g;

    lines.forEach((line, index) => {
      // ES6 imports
      let match;
      while ((match = importRegex.exec(line)) !== null) {
        const [, starAs, namedAs, namedImports, target] = match;
        dependencies.push({
          target,
          type: 'import',
          line: index + 1,
          alias: starAs || namedAs || undefined,
        });
      }

      // CommonJS requires
      while ((match = requireRegex.exec(line)) !== null) {
        const [, target] = match;
        dependencies.push({
          target,
          type: 'require',
          line: index + 1,
        });
      }

      // Re-exports
      while ((match = exportRegex.exec(line)) !== null) {
        const [, exports, target] = match;
        dependencies.push({
          target,
          type: 'export',
          line: index + 1,
        });
      }
    });

    return dependencies;
  }

  private parsePythonDependencies(lines: string[]): Array<{
    target: string;
    type: 'import' | 'export' | 'require';
    line: number;
    alias?: string;
  }> {
    const dependencies = [] as any;
    const importRegex = /^(?:from\s+([^{}\s]+)\s+)?import\s+(.+)$/;
    const fromImportRegex = /^from\s+([^{}\s]+)\s+import\s+(.+)$/;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed) return;

      const match = trimmed.match(importRegex);
      if (!match) return;

      const [, fromModule, imports] = match;
      
      if (fromModule) {
        // from X import Y
        dependencies.push({
          target: fromModule,
          type: 'import',
          line: index + 1,
          alias: imports.split(',')[0]?.trim(),
        });
      } else {
        // import X
        const modules = imports.split(',').map(m => m.trim().split(' as ')[0]);
        modules.forEach(module => {
          if (module && module !== '.') {
            dependencies.push({
              target: module,
              type: 'import',
              line: index + 1,
            });
          }
        });
      }
    });

    return dependencies;
  }

  private parseGoDependencies(lines: string[]): Array<{
    target: string;
    type: 'import' | 'export' | 'require';
    line: number;
    alias?: string;
  }> {
    const dependencies = [] as any;
    const importRegex = /import\s+(?:"([^"]+)"|'([^']+)')/;

    lines.forEach((line, index) => {
      const match = line.match(importRegex);
      if (match) {
        const target = match[1] || match[2];
        dependencies.push({
          target,
          type: 'import',
          line: index + 1,
        });
      }
    });

    return dependencies;
  }

  private parseRustDependencies(lines: string[]): Array<{
    target: string;
    type: 'import' | 'export' | 'require';
    line: number;
    alias?: string;
  }> {
    const dependencies = [] as any;
    const useRegex = /use\s+(.+);/;
    const modRegex = /mod\s+([^;]+);/;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // use statements
      const useMatch = trimmed.match(useRegex);
      if (useMatch) {
        const target = useMatch[1].split('::')[0];
        dependencies.push({
          target,
          type: 'import',
          line: index + 1,
        });
      }

      // mod statements
      const modMatch = trimmed.match(modRegex);
      if (modMatch) {
        dependencies.push({
          target: modMatch[1],
          type: 'import',
          line: index + 1,
        });
      }
    });

    return dependencies;
  }

  private resolveDependencyTarget(
    dependency: { target: string; type: string },
    files: Array<{ path: string }>,
    repositoryId: string,
  ): string | null {
    const { target } = dependency;

    // Check if it's a relative path import
    if (target.startsWith('./') || target.startsWith('../')) {
      // This would need more sophisticated path resolution
      // For now, try to find matching files
      const normalizedTarget = target.replace(/^\.\//, '').replace(/^\.\.\//, '');
      const matchingFile = files.find(f => f.path.includes(normalizedTarget));
      
      if (matchingFile) {
        return `file:${matchingFile.path}`;
      }
    }

    // Check if it's a local file import (no extension)
    const localFile = files.find(f => f.path === `${target}.ts` || f.path === `${target}.js` || f.path === `${target}.py`);
    if (localFile) {
      return `file:${localFile.path}`;
    }

    // External package - create a package node
    return `package:${target}`;
  }

  async getCachedGraph(repositoryId: string): Promise<DependencyGraph | null> {
    const cacheKey = `dependency:graph:${repositoryId}`;
    const result = await this.cacheManager.get<DependencyGraph>(cacheKey);
    return result || null;
  }

  async invalidateCache(repositoryId: string): Promise<void> {
    const cacheKey = `dependency:graph:${repositoryId}`;
    await this.cacheManager.del(cacheKey);
    this.logger.log(`Invalidated dependency graph cache for repository ${repositoryId}`);
  }
}
