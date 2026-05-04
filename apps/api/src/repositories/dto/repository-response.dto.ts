import { Expose, Transform, plainToInstance } from 'class-transformer';

type RepositoryLike = {
  id: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  private: boolean;
  status: string;
  language: string | null;
  fileCount: number | null;
  totalLines: number | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { analyses?: number };
};

export class RepositoryResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  fullName!: string;

  @Expose()
  url!: string;

  @Expose()
  defaultBranch!: string;

  @Expose()
  private!: boolean;

  @Expose()
  status!: string;

  @Expose()
  language!: string | null;

  @Expose()
  fileCount!: number | null;

  @Expose()
  totalLines!: number | null;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  createdAt!: string;

  @Expose()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  updatedAt!: string;

  @Expose()
  analysesCount!: number;

  static fromEntity(entity: RepositoryLike): RepositoryResponseDto {
    return plainToInstance(
      RepositoryResponseDto,
      {
        ...entity,
        analysesCount: entity._count?.analyses ?? 0,
      },
      { excludeExtraneousValues: true },
    );
  }
}
