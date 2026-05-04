import { IsOptional, IsString, Length, Matches } from 'class-validator';

const GITHUB_REPO_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/;

export class CreateRepositoryDto {
  @IsString()
  @Matches(GITHUB_REPO_URL_PATTERN, {
    message: 'url must be a valid GitHub repository URL like github.com/owner/repo',
  })
  url!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;
}
