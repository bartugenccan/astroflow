-- Anonymous device identities (issued via POST /auth/device).
CREATE TABLE "device_identities" (
    "deviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "device_identities_pkey" PRIMARY KEY ("deviceId")
);

-- Daily AI generation counters (per device and global "*").
CREATE TABLE "ai_usage" (
    "day" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("day","deviceId")
);
