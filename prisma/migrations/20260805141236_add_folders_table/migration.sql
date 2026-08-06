-- CreateTable
CREATE TABLE IF NOT EXISTS "folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- Backfill existing folder ids before adding foreign keys.
INSERT INTO "folders" ("id", "name")
SELECT DISTINCT folder_id, folder_id
FROM (
    SELECT "folder_id" FROM "files"
    UNION ALL
    SELECT "folder_id" FROM "download_events"
    UNION ALL
    SELECT "folder_id" FROM "multipart_uploads"
    UNION ALL
    SELECT "folder_id" FROM "services"
) AS folder_sources
WHERE folder_id IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "multipart_uploads" ADD CONSTRAINT "multipart_uploads_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
