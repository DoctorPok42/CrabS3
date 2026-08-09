-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogAction" ADD VALUE 'FOLDER_RENAMED';
ALTER TYPE "LogAction" ADD VALUE 'FOLDER_DELETED';
ALTER TYPE "LogAction" ADD VALUE 'SERVICE_INVITE_CREATED';
ALTER TYPE "LogAction" ADD VALUE 'SERVICE_INVITE_USED';

-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_service_id_fkey";

-- DropForeignKey
ALTER TABLE "multipart_uploads" DROP CONSTRAINT "multipart_uploads_folder_id_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_folder_id_fkey";

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "multipart_uploads" ADD CONSTRAINT "multipart_uploads_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
