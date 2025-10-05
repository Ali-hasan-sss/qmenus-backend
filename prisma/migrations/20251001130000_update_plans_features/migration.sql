-- AlterTable
ALTER TABLE "plans" ADD COLUMN "maxCategories" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "plans" ADD COLUMN "maxItems" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "plans" ADD COLUMN "canCustomizeTheme" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN "isFree" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ALTER COLUMN "maxMenus" SET DEFAULT 1;

-- Update existing plans with proper values
UPDATE "plans" SET "maxCategories" = 10, "maxItems" = 50, "canCustomizeTheme" = true WHERE "type" = 'BASIC';
UPDATE "plans" SET "maxCategories" = 50, "maxItems" = 500, "canCustomizeTheme" = true WHERE "type" = 'PREMIUM';
UPDATE "plans" SET "maxCategories" = 999, "maxItems" = 9999, "canCustomizeTheme" = true WHERE "type" = 'ENTERPRISE';

