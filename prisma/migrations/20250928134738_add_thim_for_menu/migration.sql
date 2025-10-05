/*
  Warnings:

  - The values [CONFIRMED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- CreateTable
CREATE TABLE "menu_themes" (
    "id" TEXT NOT NULL,
    "layoutType" TEXT NOT NULL DEFAULT 'grid',
    "showPrices" BOOLEAN NOT NULL DEFAULT true,
    "showImages" BOOLEAN NOT NULL DEFAULT true,
    "showDescriptions" BOOLEAN NOT NULL DEFAULT true,
    "primaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1E40AF',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "textColor" TEXT NOT NULL DEFAULT '#1F2937',
    "accentColor" TEXT NOT NULL DEFAULT '#F59E0B',
    "primaryColorOpacity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "secondaryColorOpacity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "backgroundColorOpacity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "textColorOpacity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "accentColorOpacity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "headingSize" TEXT NOT NULL DEFAULT 'text-2xl',
    "bodySize" TEXT NOT NULL DEFAULT 'text-base',
    "priceSize" TEXT NOT NULL DEFAULT 'text-lg',
    "cardPadding" TEXT NOT NULL DEFAULT 'p-4',
    "cardMargin" TEXT NOT NULL DEFAULT 'm-2',
    "borderRadius" TEXT NOT NULL DEFAULT 'rounded-lg',
    "categoryStyle" TEXT NOT NULL DEFAULT 'tabs',
    "showCategoryImages" BOOLEAN NOT NULL DEFAULT false,
    "itemLayout" TEXT NOT NULL DEFAULT 'vertical',
    "imageAspect" TEXT NOT NULL DEFAULT 'square',
    "backgroundImage" TEXT,
    "backgroundOverlay" TEXT,
    "backgroundPosition" TEXT NOT NULL DEFAULT 'center',
    "backgroundSize" TEXT NOT NULL DEFAULT 'cover',
    "backgroundRepeat" TEXT NOT NULL DEFAULT 'no-repeat',
    "customCSS" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "restaurantId" TEXT NOT NULL,

    CONSTRAINT "menu_themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_themes_restaurantId_key" ON "menu_themes"("restaurantId");

-- AddForeignKey
ALTER TABLE "menu_themes" ADD CONSTRAINT "menu_themes_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
