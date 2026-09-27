-- AlterEnum
-- Cache kinds for tarot readings (one per card + the spread synthesis).
ALTER TYPE "InterpretationKind" ADD VALUE 'TAROT_CARD';
ALTER TYPE "InterpretationKind" ADD VALUE 'TAROT_SYNTHESIS';
