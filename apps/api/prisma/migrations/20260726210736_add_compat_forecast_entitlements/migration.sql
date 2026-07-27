-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InterpretationKind" ADD VALUE 'COMPATIBILITY';
ALTER TYPE "InterpretationKind" ADD VALUE 'FORECAST_WEEKLY';
ALTER TYPE "InterpretationKind" ADD VALUE 'FORECAST_MONTHLY';

-- CreateTable
CREATE TABLE "device_unlocked_features" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "featureType" "FeatureType" NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_unlocked_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_people" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "relationship" TEXT,
    "birthDate" TEXT NOT NULL,
    "birthTime" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "unknownTime" BOOLEAN NOT NULL DEFAULT false,
    "placeName" TEXT,
    "sunSign" TEXT NOT NULL,
    "moonSign" TEXT NOT NULL,
    "risingSign" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_people_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_unlocked_features_deviceId_idx" ON "device_unlocked_features"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "device_unlocked_features_deviceId_featureType_key" ON "device_unlocked_features"("deviceId", "featureType");

-- CreateIndex
CREATE INDEX "saved_people_deviceId_createdAt_idx" ON "saved_people"("deviceId", "createdAt");
