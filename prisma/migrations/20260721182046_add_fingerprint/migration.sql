-- CreateTable
CREATE TABLE "download_events" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT,
    "hash" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
