-- AlterEnum
ALTER TYPE "KitchenItemStatus" ADD VALUE 'PENDING';

-- AlterTable: Change default value from PREPARING to PENDING
ALTER TABLE "order_items" ALTER COLUMN "kitchenItemStatus" SET DEFAULT 'PENDING';

-- Update existing items that are PREPARING to PENDING for active orders
UPDATE "order_items" SET "kitchenItemStatus" = 'PENDING' WHERE "kitchenItemStatus" = 'PREPARING' AND "orderId" IN (SELECT "id" FROM "orders" WHERE "status" IN ('PENDING', 'PREPARING'));
