-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('APPLE', 'GOOGLE', 'EMAIL');

-- DropForeignKey
ALTER TABLE "birth_profiles" DROP CONSTRAINT "birth_profiles_userId_fkey";

-- DropForeignKey
ALTER TABLE "ritual_logs" DROP CONSTRAINT "ritual_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "unlocked_features" DROP CONSTRAINT "unlocked_features_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_streaks" DROP CONSTRAINT "user_streaks_userId_fkey";

-- AlterTable
ALTER TABLE "device_identities" ADD COLUMN     "subjectId" TEXT;

-- DropTable
DROP TABLE "birth_profiles";

-- DropTable
DROP TABLE "daily_actions";

-- DropTable
DROP TABLE "frequency_scores";

-- DropTable
DROP TABLE "ritual_logs";

-- DropTable
DROP TABLE "unlocked_features";

-- DropTable
DROP TABLE "user_streaks";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "EnergyState";

-- DropEnum
DROP TYPE "RitualType";

-- DropEnum
DROP TYPE "SynergyLevel";

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "subjectId" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerSubject" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "appleRefreshTokenEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_otps" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_subjectId_key" ON "accounts"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_providerSubject_key" ON "auth_identities"("provider", "providerSubject");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_accountId_provider_key" ON "auth_identities"("accountId", "provider");

-- CreateIndex
CREATE INDEX "email_otps_email_createdAt_idx" ON "email_otps"("email", "createdAt");

-- CreateIndex
CREATE INDEX "device_identities_subjectId_idx" ON "device_identities"("subjectId");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

