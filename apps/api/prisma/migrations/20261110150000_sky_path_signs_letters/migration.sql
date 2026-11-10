-- AlterTable
ALTER TABLE "mascot_states" ADD COLUMN     "lessonsDone" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "lessonsEarly" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "novaLook" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passes" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "intention_signs" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "intentionId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intention_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aster_letters" (
    "deviceId" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aster_letters_pkey" PRIMARY KEY ("deviceId","week")
);

-- CreateIndex
CREATE INDEX "intention_signs_deviceId_intentionId_idx" ON "intention_signs"("deviceId", "intentionId");

-- AddForeignKey
ALTER TABLE "intention_signs" ADD CONSTRAINT "intention_signs_intentionId_fkey" FOREIGN KEY ("intentionId") REFERENCES "intentions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
