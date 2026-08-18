-- AlterTable
ALTER TABLE "folders" ADD COLUMN "user_id" INTEGER;

UPDATE "folders" f
SET "user_id" = sub.user_id
FROM (
  SELECT DISTINCT ON (folder_id) folder_id, user_id
  FROM "files"
  WHERE folder_id IS NOT NULL AND user_id IS NOT NULL
  ORDER BY folder_id, uploaded_at ASC NULLS LAST
) sub
WHERE f.id = sub.folder_id;

-- CreateIndex
CREATE INDEX "folders_user_id_idx" ON "folders"("user_id");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
