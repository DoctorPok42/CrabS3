-- AlterTable
ALTER TABLE "files" ADD COLUMN     "hash" TEXT,
ADD COLUMN     "storage_key" TEXT;

-- CreateIndex
CREATE INDEX "files_user_id_hash_idx" ON "files"("user_id", "hash");

-- CreateIndex
CREATE INDEX "files_storage_key_idx" ON "files"("storage_key");
