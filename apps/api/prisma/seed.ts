import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const anonymousUser = await prisma.user.upsert({
    where: { email: 'anonymous@codexray.dev' },
    update: {},
    create: {
      email: 'anonymous@codexray.dev',
      tier: 'anonymous',
      creditsUsed: 0,
    },
  });

  const freeUser = await prisma.user.upsert({
    where: { email: 'free@codexray.dev' },
    update: {},
    create: {
      email: 'free@codexray.dev',
      tier: 'free',
      githubId: 10001,
      creditsUsed: 42,
    },
  });

  const proUser = await prisma.user.upsert({
    where: { email: 'pro@codexray.dev' },
    update: {},
    create: {
      email: 'pro@codexray.dev',
      tier: 'pro',
      githubId: 10002,
      creditsUsed: 128,
    },
  });

  const repositories = await Promise.all([
    prisma.repository.upsert({
      where: { fullName: 'codexray/platform-core' },
      update: {},
      create: {
        name: 'platform-core',
        fullName: 'codexray/platform-core',
        url: 'https://github.com/codexray/platform-core',
        importedById: freeUser.id,
        status: 'analyzed',
        fileCount: 486,
        totalLines: 64218,
        language: 'TypeScript',
      },
    }),
    prisma.repository.upsert({
      where: { fullName: 'codexray/analysis-failed' },
      update: {},
      create: {
        name: 'analysis-failed',
        fullName: 'codexray/analysis-failed',
        url: 'https://github.com/codexray/analysis-failed',
        importedById: proUser.id,
        status: 'failed',
        errorMessage: 'Dependency parser timeout after 900 seconds.',
      },
    }),
    prisma.repository.upsert({
      where: { fullName: 'codexray/empty-repo' },
      update: {},
      create: {
        name: 'empty-repo',
        fullName: 'codexray/empty-repo',
        url: 'https://github.com/codexray/empty-repo',
        importedById: anonymousUser.id,
        status: 'cloned',
        fileCount: 0,
        totalLines: 0,
      },
    }),
  ]);

  await Promise.all([
    prisma.analysis.create({
      data: {
        repositoryId: repositories[0].id,
        type: 'full_analysis',
        status: 'completed',
        progressPct: 100,
        resultJson: {
          summary: 'Analysis complete',
          complexity: 'medium',
        },
        completedAt: new Date(),
      },
    }),
    prisma.analysis.create({
      data: {
        repositoryId: repositories[1].id,
        type: 'execution_flow',
        status: 'failed',
        progressPct: 35,
        errorMessage: 'Failed to instrument dynamic imports.',
      },
    }),
    prisma.analysis.create({
      data: {
        repositoryId: repositories[2].id,
        type: 'dependency_graph',
        status: 'completed',
        progressPct: 100,
        resultJson: {
          nodes: 0,
          edges: 0,
          note: 'No dependencies found.',
        },
        completedAt: new Date(),
      },
    }),
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
