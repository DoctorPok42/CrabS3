-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "SettingCategory" AS ENUM ('LOGGING', 'STORAGE', 'UPLOAD', 'SECURITY', 'EMAIL', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('CLEAN', 'INFECTED', 'SKIP', 'WAIT', 'ERROR');

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "scan_result" "ScanResult" DEFAULT 'WAIT';

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "SettingType" NOT NULL DEFAULT 'STRING',
    "category" "SettingCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "settings"("category");

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
