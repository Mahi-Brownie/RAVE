import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name'] as const;
const ALLOWED_ORDER = ['asc', 'desc'] as const;

export type RepositorySortField = (typeof ALLOWED_SORT_FIELDS)[number];
export type RepositorySortOrder = (typeof ALLOWED_ORDER)[number];

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsIn(ALLOWED_SORT_FIELDS)
  sort: RepositorySortField = 'updatedAt';

  @IsOptional()
  @IsIn(ALLOWED_ORDER)
  order: RepositorySortOrder = 'desc';
}
