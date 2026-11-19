-- Premium subscription cache per subject (RevenueCat entitlement "premium").
CREATE TABLE "subscriptions" (
    "deviceId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "store" TEXT,
    "environment" TEXT,
    "willRenew" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("deviceId")
);
