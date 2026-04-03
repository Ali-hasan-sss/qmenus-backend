-- AlterTable
ALTER TABLE "restaurant_settings" ADD COLUMN IF NOT EXISTS "defaultOrderItems" JSONB;
