-- CreateTable
CREATE TABLE "downloads" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT,
    "downloaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "uploaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),
    "storage" TEXT DEFAULT 'hot',
    "max_downloads" INTEGER,
    "download_count" INTEGER DEFAULT 0,
    "password_hash" TEXT,
    "email_sender" TEXT,
    "email_recipient" TEXT,
    "upload_token" TEXT,
    "download_token" TEXT,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multipart_uploads" (
    "file_id" TEXT NOT NULL,
    "upload_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "chunk_size" INTEGER NOT NULL,
    "total_size" BIGINT NOT NULL,
    "parts" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "multipart_uploads_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "upload_tokens" (
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "used" BOOLEAN DEFAULT false,

    CONSTRAINT "upload_tokens_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "files_upload_token_key" ON "files"("upload_token");

-- CreateIndex
CREATE UNIQUE INDEX "files_download_token_key" ON "files"("download_token");

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
