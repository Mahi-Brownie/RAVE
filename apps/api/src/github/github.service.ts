import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);

  constructor(private readonly prisma: PrismaService) {}

  async cloneRepository(url: string, repositoryId: string): Promise<void> {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'repo-'));
    let git: SimpleGit;

    try {
      this.logger.log(`Starting clone of repository ${repositoryId} from ${url}`);

      // Update repository status to cloning
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { status: 'cloning' },
      });

      git = simpleGit(tempDir);
      
      // Clone the repository
      await git.clone(url, tempDir, ['--depth', '1']);
      this.logger.log(`Repository cloned to ${tempDir}`);

      // Walk file tree and store files
      const { fileCount, totalLines } = await this.walkAndStoreFiles(tempDir, repositoryId);
      
      // Update repository with stats and status
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: {
          status: 'cloned',
          fileCount,
          totalLines,
        },
      });

      this.logger.log(`Repository ${repositoryId} cloned successfully: ${fileCount} files, ${totalLines} lines`);

    } catch (error) {
      this.logger.error(`Failed to clone repository ${repositoryId}: ${error.message}`);
      
      // Update repository status to error
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: {
          status: 'error',
          errorMessage: error.message,
        },
      });

      throw error;
    } finally {
      // Clean up temp directory
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        this.logger.log(`Cleaned up temp directory: ${tempDir}`);
      } catch (cleanupError) {
        this.logger.warn(`Failed to clean up temp directory ${tempDir}: ${cleanupError.message}`);
      }
    }
  }

  private async walkAndStoreFiles(dir: string, repositoryId: string): Promise<{ fileCount: number; totalLines: number }> {
    const files: Array<{ repositoryId: string; path: string; content: string; sizeBytes: number }> = [];
    let totalLines = 0;
    let fileCount = 0;

    const walkDir = async (currentDir: string, relativePath: string = '') => {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        // Skip directories and unwanted files
        if (entry.isDirectory()) {
          // Skip .git, node_modules, and other common ignore directories
          if (this.shouldSkipDirectory(entry.name)) {
            continue;
          }
          await walkDir(fullPath, entryRelativePath);
          continue;
        }

        // Skip binary files and very large files
        if (this.shouldSkipFile(entry.name, fullPath)) {
          continue;
        }

        try {
          const content = await fs.promises.readFile(fullPath, 'utf-8');
          const sizeBytes = content.length;
          const lineCount = (content.match(/\n/g) || []).length + 1;

          files.push({
            repositoryId,
            path: entryRelativePath,
            content,
            sizeBytes,
          });

          totalLines += lineCount;
          fileCount++;

        } catch (fileError) {
          this.logger.warn(`Failed to read file ${fullPath}: ${fileError.message}`);
        }
      }
    };

    await walkDir(dir);

    // Batch insert files to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await (this.prisma as any).projectFile.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }

    return { fileCount, totalLines };
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      '.git',
      'node_modules',
      '.next',
      'dist',
      'build',
      'target',
      'vendor',
      '.vscode',
      '.idea',
      'coverage',
      '.nyc_output',
      'tmp',
      'temp',
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  private shouldSkipFile(fileName: string, fullPath: string): boolean {
    // Skip binary files by extension
    const binaryExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
      '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
      '.exe', '.dll', '.so', '.dylib',
      '.mp3', '.mp4', '.avi', '.mov', '.wav',
      '.ttf', '.woff', '.woff2', '.eot',
    ];

    const ext = path.extname(fileName).toLowerCase();
    if (binaryExtensions.includes(ext)) {
      return true;
    }

    // Skip very large files (>1MB)
    try {
      const stats = fs.statSync(fullPath);
      return stats.size > 1024 * 1024; // 1MB
    } catch {
      return true; // Skip if we can't stat the file
    }
  }
}
