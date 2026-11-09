-- AlterTable
ALTER TABLE "intention_streaks" ADD COLUMN "shieldUsedDates" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "mascot_states" (
    "deviceId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "stardust" INTEGER NOT NULL DEFAULT 0,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "equipped" JSONB NOT NULL DEFAULT '[]',
    "owned" JSONB NOT NULL DEFAULT '[]',
    "shields" INTEGER NOT NULL DEFAULT 0,
    "lastFreeShieldWeek" TEXT,
    "hatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mascot_states_pkey" PRIMARY KEY ("deviceId")
);

-- CreateTable
CREATE TABLE "mascot_events" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "refKey" TEXT NOT NULL DEFAULT '',
    "xp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mascot_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mascot_events_deviceId_localDate_idx" ON "mascot_events"("deviceId", "localDate");

-- CreateIndex
CREATE INDEX "mascot_events_deviceId_kind_refKey_idx" ON "mascot_events"("deviceId", "kind", "refKey");

-- CreateIndex
CREATE UNIQUE INDEX "mascot_events_deviceId_kind_localDate_refKey_key" ON "mascot_events"("deviceId", "kind", "localDate", "refKey");
