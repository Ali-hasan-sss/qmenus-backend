/*
  Warnings:

  - Added the required column `updatedAt` to the `email_verifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "email_verifications" ADD COLUMN     "updatedAt" TIMESTAMP(3);
UPDATE "email_verifications" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "email_verifications" ALTER COLUMN "updatedAt" SET NOT NULL;
