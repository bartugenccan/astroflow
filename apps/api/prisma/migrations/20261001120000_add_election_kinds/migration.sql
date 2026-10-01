-- AlterEnum
-- Cache kinds for electional readings (a date check and a date search).
ALTER TYPE "InterpretationKind" ADD VALUE 'ELECTION_CHECK';
ALTER TYPE "InterpretationKind" ADD VALUE 'ELECTION_SEARCH';
