-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EnergyState" AS ENUM ('HARMONY', 'MOMENTUM', 'STRESS', 'OVERLOAD');

-- CreateEnum
CREATE TYPE "RitualType" AS ENUM ('WATER_PROGRAMMING', 'KINETIC_SYNC', 'BREATHWORK', 'GROUNDING', 'LIGHT_EXPOSURE', 'FREQUENCY_TUNING');

-- CreateEnum
CREATE TYPE "SynergyLevel" AS ENUM ('ALPHA', 'BETA', 'GAMMA', 'DELTA', 'OMEGA');

-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('TRANSIT_CHART', 'COMPATIBILITY', 'DEEP_INSIGHT', 'PREMIUM_RITUAL', 'ADVANCED_CYMATICS');

-- CreateEnum
CREATE TYPE "InterpretationKind" AS ENUM ('PLACEMENT', 'BIG_THREE', 'ASPECT', 'OVERVIEW', 'DAILY_INSIGHT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "starPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birth_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "birthDate" DATE NOT NULL,
    "birthTime" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "sunSign" TEXT NOT NULL,
    "moonSign" TEXT NOT NULL,
    "risingSign" TEXT NOT NULL,
    "risingDegree" DOUBLE PRECISION NOT NULL,
    "dominantElement" TEXT,
    "dominantPlanet" TEXT,
    "chartData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "birth_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_streaks" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ritualType" "RitualType" NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATE NOT NULL,
    "totalCompletions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ritual_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ritualType" "RitualType" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frequencyBoost" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "ritual_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frequency_scores" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "trend" TEXT NOT NULL DEFAULT 'stable',
    "synergyLevel" "SynergyLevel" NOT NULL DEFAULT 'ALPHA',
    "breakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "frequency_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_actions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ritualType" "RitualType" NOT NULL,
    "energyCost" INTEGER NOT NULL DEFAULT 0,
    "frequencyBoost" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unlocked_features" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "featureType" "FeatureType" NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unlocked_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_charts" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "birthTime" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "utcOffsetMin" INTEGER,
    "unknownTime" BOOLEAN NOT NULL DEFAULT false,
    "sunSign" TEXT NOT NULL,
    "moonSign" TEXT NOT NULL,
    "risingSign" TEXT NOT NULL,
    "chartData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interpretations" (
    "id" UUID NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "kind" "InterpretationKind" NOT NULL,
    "locale" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interpretations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "birth_profiles_userId_key" ON "birth_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_streaks_userId_ritualType_key" ON "user_streaks"("userId", "ritualType");

-- CreateIndex
CREATE INDEX "ritual_logs_userId_completedAt_idx" ON "ritual_logs"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "frequency_scores_userId_key" ON "frequency_scores"("userId");

-- CreateIndex
CREATE INDEX "daily_actions_userId_completed_expiresAt_idx" ON "daily_actions"("userId", "completed", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "unlocked_features_userId_featureType_key" ON "unlocked_features"("userId", "featureType");

-- CreateIndex
CREATE UNIQUE INDEX "device_charts_deviceId_key" ON "device_charts"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "interpretations_cacheKey_key" ON "interpretations"("cacheKey");

-- CreateIndex
CREATE INDEX "interpretations_kind_locale_idx" ON "interpretations"("kind", "locale");

-- AddForeignKey
ALTER TABLE "birth_profiles" ADD CONSTRAINT "birth_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ritual_logs" ADD CONSTRAINT "ritual_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unlocked_features" ADD CONSTRAINT "unlocked_features_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

