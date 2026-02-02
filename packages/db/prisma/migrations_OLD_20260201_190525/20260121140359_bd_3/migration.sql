/*
  Warnings:

  - The `provider` column on the `EmailEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('RESEND', 'GMAIL');

-- AlterTable
ALTER TABLE "EmailEvent" ADD COLUMN     "fromEmail" TEXT,
ADD COLUMN     "threadId" TEXT,
DROP COLUMN "provider",
ADD COLUMN     "provider" "EmailProvider" NOT NULL DEFAULT 'RESEND';

-- CreateIndex
CREATE INDEX "EmailEvent_provider_createdAt_idx" ON "EmailEvent"("provider", "createdAt");
