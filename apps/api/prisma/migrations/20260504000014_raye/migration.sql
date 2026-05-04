-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Explanation" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "depthLevel" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "fileHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Explanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RebuildGuide" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "complexity" INTEGER NOT NULL,
    "totalSteps" INTEGER NOT NULL,
    "stepsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RebuildGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAudit" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "scanType" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "findings" JSONB NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "repositoryId" TEXT,
    "filePath" TEXT,
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptEdge" (
    "id" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "dependentId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,

    CONSTRAINT "ConceptEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "masteredConcepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strugglingConcepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completedQuizzes" INTEGER NOT NULL DEFAULT 0,
    "completedExercises" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "conceptId" TEXT,
    "level" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "answers" JSONB NOT NULL,
    "passedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconstructionExercise" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "complexity" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconstructionExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconstructionAttempt" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStage" INTEGER NOT NULL DEFAULT 1,
    "totalStages" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconstructionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectFile_repositoryId_idx" ON "ProjectFile"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFile_repositoryId_path_key" ON "ProjectFile"("repositoryId", "path");

-- CreateIndex
CREATE INDEX "Explanation_repositoryId_idx" ON "Explanation"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Explanation_repositoryId_filePath_depthLevel_key" ON "Explanation"("repositoryId", "filePath", "depthLevel");

-- CreateIndex
CREATE INDEX "RebuildGuide_repositoryId_idx" ON "RebuildGuide"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RebuildGuide_repositoryId_complexity_key" ON "RebuildGuide"("repositoryId", "complexity");

-- CreateIndex
CREATE INDEX "SecurityAudit_repositoryId_idx" ON "SecurityAudit"("repositoryId");

-- CreateIndex
CREATE INDEX "ConceptNode_category_idx" ON "ConceptNode"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptNode_name_repositoryId_key" ON "ConceptNode"("name", "repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptEdge_prerequisiteId_dependentId_key" ON "ConceptEdge"("prerequisiteId", "dependentId");

-- CreateIndex
CREATE INDEX "UserProgress_userId_idx" ON "UserProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_repositoryId_key" ON "UserProgress"("userId", "repositoryId");

-- CreateIndex
CREATE INDEX "Quiz_repositoryId_idx" ON "Quiz"("repositoryId");

-- CreateIndex
CREATE INDEX "Quiz_conceptId_idx" ON "Quiz"("conceptId");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");

-- CreateIndex
CREATE INDEX "ReconstructionExercise_repositoryId_idx" ON "ReconstructionExercise"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ReconstructionExercise_repositoryId_complexity_key" ON "ReconstructionExercise"("repositoryId", "complexity");

-- CreateIndex
CREATE INDEX "ReconstructionAttempt_userId_idx" ON "ReconstructionAttempt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReconstructionAttempt_userId_exerciseId_key" ON "ReconstructionAttempt"("userId", "exerciseId");

-- AddForeignKey
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Explanation" ADD CONSTRAINT "Explanation_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebuildGuide" ADD CONSTRAINT "RebuildGuide_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptEdge" ADD CONSTRAINT "ConceptEdge_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "ConceptNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptEdge" ADD CONSTRAINT "ConceptEdge_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "ConceptNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
