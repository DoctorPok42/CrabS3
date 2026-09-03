-- CreateEnum
CREATE TYPE "AccessTokenScope" AS ENUM ('READ', 'WRITE', 'DELETE', 'ADMIN');

-- CreateTable
CREATE TABLE "user_access_tokens" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "scopes" "AccessTokenScope"[],
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "user_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_access_tokens_token_key" ON "user_access_tokens"("token");

-- CreateIndex
CREATE INDEX "user_access_tokens_user_id_idx" ON "user_access_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "user_access_tokens" ADD CONSTRAINT "user_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
