-- CreateEnum
CREATE TYPE "KitchenItemStatus" AS ENUM ('PREPARING', 'COMPLETED');

-- CreateTable
CREATE TABLE "kitchen_sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "restaurantId" TEXT NOT NULL,

    CONSTRAINT "kitchen_sections_pkey" PRIMARY KEY ("id")
);

-- AddColumn to menu_items
ALTER TABLE "menu_items" ADD COLUMN "kitchenSectionId" TEXT;

-- AddColumn to order_items
ALTER TABLE "order_items" ADD COLUMN "kitchenItemStatus" "KitchenItemStatus" NOT NULL DEFAULT 'PREPARING';

-- CreateIndex
CREATE INDEX "kitchen_sections_restaurantId_idx" ON "kitchen_sections"("restaurantId");

-- AddForeignKey
ALTER TABLE "kitchen_sections" ADD CONSTRAINT "kitchen_sections_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_kitchenSectionId_fkey" FOREIGN KEY ("kitchenSectionId") REFERENCES "kitchen_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
