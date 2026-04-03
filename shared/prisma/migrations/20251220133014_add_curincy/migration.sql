/*
  Warnings:

  - You are about to drop the column `currency` on the `menu_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "menu_items" DROP COLUMN "currency";

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';
