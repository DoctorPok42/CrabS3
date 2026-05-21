/*
  Warnings:

  - A unique constraint covering the columns `[user_id,type]` on the table `communication` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "communication_user_id_type_key" ON "communication"("user_id", "type");
