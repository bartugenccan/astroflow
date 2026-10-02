-- Owner of device-specific cached readings (deleted with the device's data).
ALTER TABLE "interpretations" ADD COLUMN "deviceId" TEXT;
CREATE INDEX "interpretations_deviceId_idx" ON "interpretations"("deviceId");
