import { IsOptional, IsString, Length, Matches } from 'class-validator';

const BRANCH_NAME_PATTERN = /^[a-zA-Z0-9._/-]+$/;

export class UpdateRepositoryDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(BRANCH_NAME_PATTERN, {
    message: 'defaultBranch must match pattern ^[a-zA-Z0-9._/-]+$',
  })
  defaultBranch?: string;
}
