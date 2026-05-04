import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

export interface PaginatedFilesResponse {
  files: FileTreeNode[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getFileContent(repositoryId: string, filePath: string): Promise<{ content: string; size: number }> {
    const file = await (this.prisma as any).projectFile.findUnique({
      where: {
        repositoryId_path: {
          repositoryId,
          path: filePath,
        },
      },
    });

    if (!file) {
      throw new NotFoundException(`File not found: ${filePath}`);
    }

    return {
      content: file.content,
      size: file.sizeBytes,
    };
  }

  async getFileTree(repositoryId: string, page: number = 1, limit: number = 100): Promise<PaginatedFilesResponse> {
    const offset = (page - 1) * limit;

    // Get total count of files
    const total = await (this.prisma as any).projectFile.count({
      where: { repositoryId },
    });

    // Get paginated files
    const files = await (this.prisma as any).projectFile.findMany({
      where: { repositoryId },
      select: {
        path: true,
        sizeBytes: true,
      },
      orderBy: { path: 'asc' },
      skip: offset,
      take: limit,
    });

    // Build tree structure
    const tree = this.buildFileTree(files);

    return {
      files: tree,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRepositoryStats(repositoryId: string): Promise<{ fileCount: number; totalSize: number; totalLines: number }> {
    const stats = await (this.prisma as any).projectFile.aggregate({
      where: { repositoryId },
      _count: {
        id: true,
      },
      _sum: {
        sizeBytes: true,
      },
    });

    // Get total lines from repository
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { totalLines: true },
    });

    return {
      fileCount: stats._count.id || 0,
      totalSize: stats._sum.sizeBytes || 0,
      totalLines: repository?.totalLines || 0,
    };
  }

  async searchFiles(repositoryId: string, query: string, limit: number = 50): Promise<FileTreeNode[]> {
    const files = await (this.prisma as any).projectFile.findMany({
      where: {
        repositoryId,
        path: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        path: true,
        sizeBytes: true,
      },
      orderBy: { path: 'asc' },
      take: limit,
    });

    return files.map(file => ({
      name: path.basename(file.path),
      path: file.path,
      type: 'file' as const,
      size: file.sizeBytes,
    }));
  }

  private buildFileTree(files: { path: string; sizeBytes: number }[]): FileTreeNode[] {
    const tree: FileTreeNode[] = [];
    const nodeMap = new Map<string, FileTreeNode>();

    // Sort files to ensure directories come before files
    files.sort((a, b) => a.path.localeCompare(b.path));

    for (const file of files) {
      const parts = file.path.split('/');
      let currentPath = '';
      let currentLevel = tree;

      // Build directory structure
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;
        const nodePath = currentPath ? `${currentPath}/${part}` : part;

        if (!nodeMap.has(nodePath)) {
          const node: FileTreeNode = {
            name: part,
            path: nodePath,
            type: isLastPart ? 'file' : 'directory',
            size: isLastPart ? file.sizeBytes : undefined,
            children: isLastPart ? undefined : [],
          };

          nodeMap.set(nodePath, node);
          currentLevel.push(node);
        }

        currentPath = nodePath;
        if (!isLastPart && nodeMap.get(nodePath)?.children) {
          currentLevel = nodeMap.get(nodePath)?.children || [];
        }
      }
    }

    return tree;
  }

  async getFileByExtension(repositoryId: string, extensions: string[]): Promise<FileTreeNode[]> {
    const files = await (this.prisma as any).projectFile.findMany({
      where: {
        repositoryId,
        OR: extensions.map(ext => ({
          path: {
            endsWith: ext,
            mode: 'insensitive',
          },
        })),
      },
      select: {
        path: true,
        sizeBytes: true,
      },
      orderBy: { path: 'asc' },
    });

    return files.map(file => ({
      name: path.basename(file.path),
      path: file.path,
      type: 'file' as const,
      size: file.sizeBytes,
    }));
  }

  async getDirectoryContents(repositoryId: string, dirPath: string = ''): Promise<FileTreeNode[]> {
    const whereClause = dirPath
      ? {
          repositoryId,
          path: {
            startsWith: dirPath.endsWith('/') ? dirPath : `${dirPath}/`,
            mode: 'insensitive',
          },
        }
      : { repositoryId };

    const files = await (this.prisma as any).projectFile.findMany({
      where: whereClause,
      select: {
        path: true,
        sizeBytes: true,
      },
      orderBy: { path: 'asc' },
    });

    // Filter to only show immediate children of the directory
    const immediateChildren = files
      .map(file => {
        const relativePath = dirPath ? file.path.substring(dirPath.length + 1) : file.path;
        const firstPart = relativePath.split('/')[0];
        return {
          ...file,
          relativePath: firstPart,
        };
      })
      .filter((file, index, self) => 
        self.findIndex(f => f.relativePath === file.relativePath) === index
      )
      .map(file => ({
        name: file.relativePath,
        path: file.path,
        type: file.relativePath.includes('.') ? 'file' : 'directory' as const,
        size: file.relativePath.includes('.') ? file.sizeBytes : undefined,
      }));

    return immediateChildren;
  }
}
