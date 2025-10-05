-- AlterTable
ALTER TABLE "order_items" 
ADD COLUMN "customItemName" TEXT,
ADD COLUMN "customItemNameAr" TEXT,
ADD COLUMN "isCustomItem" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "menuItemId" DROP NOT NULL;

