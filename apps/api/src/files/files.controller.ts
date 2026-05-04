import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FilesService } from './files.service';

@Controller('repositories')
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':id/files')
  async getFileTree(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<import('./files.service').PaginatedFilesResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 100;

    return this.filesService.getFileTree(repositoryId, pageNum, limitNum);
  }

  @Get(':id/files/content')
  async getFileContent(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
    @Query('path') filePath: string,
  ): Promise<{ content: string; size: number }> {
    if (!filePath) {
      throw new Error('Path parameter is required');
    }

    return this.filesService.getFileContent(repositoryId, filePath);
  }

  @Get(':id/files/stats')
  async getRepositoryStats(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
  ): Promise<{ fileCount: number; totalSize: number; totalLines: number }> {
    return this.filesService.getRepositoryStats(repositoryId);
  }

  @Get(':id/files/search')
  async searchFiles(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<import('./files.service').FileTreeNode[]> {
    if (!query) {
      throw new Error('Query parameter is required');
    }

    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.filesService.searchFiles(repositoryId, query, limitNum);
  }

  @Get(':id/files/directory')
  async getDirectoryContents(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
    @Query('path') dirPath?: string,
  ): Promise<import('./files.service').FileTreeNode[]> {
    return this.filesService.getDirectoryContents(repositoryId, dirPath || '');
  }

  @Get(':id/files/extensions')
  async getFilesByExtension(
    @CurrentUser() user: any,
    @Param('id') repositoryId: string,
    @Query('ext') extensions?: string | string[],
  ): Promise<import('./files.service').FileTreeNode[]> {
    const extArray = Array.isArray(extensions) 
      ? extensions 
      : extensions 
        ? [extensions] 
        : ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs'];

    return this.filesService.getFileByExtension(repositoryId, extArray);
  }
}
