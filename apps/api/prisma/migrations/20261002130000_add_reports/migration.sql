-- AlterEnum: cache kinds for report-only readings.
ALTER TYPE "InterpretationKind" ADD VALUE 'REPORT_NATAL_EXTRAS';
ALTER TYPE "InterpretationKind" ADD VALUE 'TRANSIT_SPOTLIGHT';
ALTER TYPE "InterpretationKind" ADD VALUE 'TRANSIT_QUARTER';

-- PDF report jobs.
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reports_deviceId_createdAt_idx" ON "reports"("deviceId", "createdAt");
