-- AlterTable
ALTER TABLE "files" ADD COLUMN     "service_id" INTEGER;

-- AlterTable
ALTER TABLE "secrets" ADD COLUMN     "service_id" INTEGER;

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "quota" BIGINT NOT NULL DEFAULT 10737418240,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "services"("name");

-- CreateIndex
CREATE UNIQUE INDEX "services_token_key" ON "services"("token");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
