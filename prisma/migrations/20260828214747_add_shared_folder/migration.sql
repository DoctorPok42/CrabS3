-- DropForeignKey
ALTER TABLE "settings" DROP CONSTRAINT "settings_updated_by_fkey";

-- AlterTable
ALTER TABLE "folders" ADD COLUMN     "shared_folders" JSONB;

-- CreateIndex
CREATE INDEX "settings_key_idx" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
