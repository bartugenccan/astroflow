-- CreateEnum
CREATE TYPE "MoodSky" AS ENUM ('RADIANT', 'CLEAR', 'PARTLY', 'CLOUDY', 'STORMY');

-- AlterTable
ALTER TABLE "intentions" ADD COLUMN     "manifestedAt" TIMESTAMP(3),
ADD COLUMN     "natalHouse" INTEGER,
ADD COLUMN     "plantedMoon" TEXT;

-- AlterTable
ALTER TABLE "mascot_states" ADD COLUMN     "eclipseEnd" TEXT,
ADD COLUMN     "eclipseStart" TEXT,
ADD COLUMN     "journeysCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "orbitBest" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "orbitLastDate" TEXT,
ADD COLUMN     "orbitStreak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "mascot_journeys" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnsAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "discovery" JSONB NOT NULL,
    "constellationKey" TEXT NOT NULL,
    "duplicate" BOOLEAN NOT NULL DEFAULT false,
    "bonusStardust" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mascot_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mascot_constellations" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstFoundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mascot_constellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mood_checkins" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "sky" "MoodSky" NOT NULL,
    "energy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mood_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_plans" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_vaults" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "sealed" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_vaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mascot_journeys_deviceId_idx" ON "mascot_journeys"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "mascot_journeys_deviceId_localDate_key" ON "mascot_journeys"("deviceId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "mascot_constellations_deviceId_key_key" ON "mascot_constellations"("deviceId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "mood_checkins_deviceId_localDate_key" ON "mood_checkins"("deviceId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_plans_deviceId_localDate_key" ON "daily_plans"("deviceId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "user_vaults_deviceId_namespace_key" ON "user_vaults"("deviceId", "namespace");

