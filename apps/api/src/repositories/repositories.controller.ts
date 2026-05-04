import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalysisTriggerDto } from './dto/analysis-trigger.dto';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateRepositoryDto } from './dto/update-repository.dto';
import { RepositoriesService } from './repositories.service';

@Controller('repositories')
@UseGuards(AuthGuard)
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateRepositoryDto,
  ) {
    return this.repositoriesService.create(user, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query() query: PaginationQueryDto,
  ) {
    return this.repositoriesService.findAll(user, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.repositoriesService.findOne(user, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateRepositoryDto,
  ) {
    return this.repositoriesService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<void> {
    await this.repositoriesService.archive(user, id);
  }

  @Post(':id/analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerAnalysis(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AnalysisTriggerDto,
  ) {
    return this.repositoriesService.triggerAnalysis(user, id, dto);
  }

  @Get(':id/analysis-status')
  async analysisStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.repositoriesService.analysisStatus(user, id);
  }

}
