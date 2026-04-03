-- AlterTable
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(5,2);
