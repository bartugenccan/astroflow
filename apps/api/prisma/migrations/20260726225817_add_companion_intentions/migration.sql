-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InterpretationKind" ADD VALUE 'GUIDANCE';
ALTER TYPE "InterpretationKind" ADD VALUE 'INTENTION_AFFIRMATION';

-- CreateTable
CREATE TABLE "memory_entries" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intentions" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "goalText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "lifeArea" TEXT NOT NULL,
    "affirmation" TEXT NOT NULL,
    "dailyTarget" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intention_check_ins" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "intentionId" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "conviction" INTEGER NOT NULL,
    "userText" TEXT,
    "inputMode" TEXT NOT NULL DEFAULT 'text',
    "transcript" TEXT,
    "aiResponse" TEXT NOT NULL,
    "aiConviction" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intention_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intention_streaks" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "intentionId" UUID NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TEXT,
    "totalCheckIns" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intention_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "memory_entries_deviceId_createdAt_idx" ON "memory_entries"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_deviceId_createdAt_idx" ON "chat_messages"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "intentions_deviceId_idx" ON "intentions"("deviceId");

-- CreateIndex
CREATE INDEX "intention_check_ins_intentionId_date_idx" ON "intention_check_ins"("intentionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "intention_streaks_intentionId_key" ON "intention_streaks"("intentionId");

-- CreateIndex
CREATE INDEX "intention_streaks_deviceId_idx" ON "intention_streaks"("deviceId");

-- AddForeignKey
ALTER TABLE "intention_check_ins" ADD CONSTRAINT "intention_check_ins_intentionId_fkey" FOREIGN KEY ("intentionId") REFERENCES "intentions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intention_streaks" ADD CONSTRAINT "intention_streaks_intentionId_fkey" FOREIGN KEY ("intentionId") REFERENCES "intentions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
