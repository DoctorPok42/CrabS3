-- AlterTable
ALTER TABLE "session" ALTER COLUMN "expires_at" SET DEFAULT (now() + interval '1 hour');

-- CreateTable
CREATE TABLE "webhooks_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhooks_logs_user_id_idx" ON "webhooks_logs"("user_id");

-- AddForeignKey
ALTER TABLE "webhooks_logs" ADD CONSTRAINT "webhooks_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
