-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVE';
