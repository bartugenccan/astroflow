-- CreateTable
CREATE TABLE "daily_quotas" (
    "day" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_quotas_pkey" PRIMARY KEY ("day","deviceId","feature")
);

-- CreateIndex
CREATE INDEX "daily_quotas_deviceId_idx" ON "daily_quotas"("deviceId");
