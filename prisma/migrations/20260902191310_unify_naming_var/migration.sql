/*
  Warnings:

  - You are about to drop the column `createdAt` on the `invitation` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `invitation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - Added the required column `expires_at` to the `invitation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogAction" ADD VALUE 'ACCESS_TOKEN_CREATED';
ALTER TYPE "LogAction" ADD VALUE 'ACCESS_TOKEN_REVOKED';

-- DropIndex
DROP INDEX "user_access_tokens_user_id_idx";

-- AlterTable
ALTER TABLE "invitation" DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(6) NOT NULL;

-- AlterTable
ALTER TABLE "session" DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(6) NOT NULL DEFAULT (now() + interval '1 hour');

-- AlterTable
ALTER TABLE "user_access_tokens" ADD COLUMN     "last_used_at" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "user_access_tokens_user_id_token_idx" ON "user_access_tokens"("user_id", "token");
