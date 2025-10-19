/*
  Warnings:

  - Added the required column `restaurantId` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurantId` to the `menu_items` table without a default value. This is not possible if the table is not empty.

*/
-- First, add columns with default values
ALTER TABLE "categories" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Add restaurantId to categories with a default value, then update it
ALTER TABLE "categories" ADD COLUMN "restaurantId" TEXT;
UPDATE "categories" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "categories" ALTER COLUMN "restaurantId" SET NOT NULL;

-- Add new columns to menu_items
ALTER TABLE "menu_items" ADD COLUMN "allergens" TEXT,
ADD COLUMN "calories" INTEGER,
ADD COLUMN "cookingMethod" TEXT,
ADD COLUMN "cost" DECIMAL(10,2),
ADD COLUMN "dietaryInfo" TEXT,
ADD COLUMN "ingredients" TEXT,
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "nutritionalInfo" TEXT,
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "preparationTime" INTEGER,
ADD COLUMN "servingSize" TEXT,
ADD COLUMN "spiceLevel" INTEGER,
ADD COLUMN "tags" TEXT;

-- Add restaurantId to menu_items with a default value, then update it
ALTER TABLE "menu_items" ADD COLUMN "restaurantId" TEXT;
UPDATE "menu_items" SET "restaurantId" = (SELECT "id" FROM "restaurants" LIMIT 1) WHERE "restaurantId" IS NULL;
ALTER TABLE "menu_items" ALTER COLUMN "restaurantId" SET NOT NULL;

-- CreateTable
CREATE TABLE "menu_item_extras" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "menuItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_item_extras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_variants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceModifier" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "menuItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_item_variants_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_extras" ADD CONSTRAINT "menu_item_extras_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
