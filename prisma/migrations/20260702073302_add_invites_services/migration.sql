/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `services` will be added. If there are existing duplicate values, this will fail.
  - The required column `uuid` was added to the `services` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "services" ADD COLUMN     "folder_id" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "uuid" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "invites" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "service_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "max_uses" INTEGER NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invites_code_key" ON "invites"("code");

-- CreateIndex
CREATE UNIQUE INDEX "services_uuid_key" ON "services"("uuid");

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
