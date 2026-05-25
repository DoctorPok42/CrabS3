-- AlterTable
ALTER TABLE "files" ADD COLUMN     "infected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "infected_by" TEXT,
ADD COLUMN     "scanned_at" TIMESTAMP(6);
