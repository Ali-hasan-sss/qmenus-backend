-- CreateTable
CREATE TABLE "currency_exchanges" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(10,6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "restaurantId" TEXT NOT NULL,

    CONSTRAINT "currency_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currency_exchanges_restaurantId_currency_key" ON "currency_exchanges"("restaurantId", "currency");

-- CreateIndex
CREATE INDEX "currency_exchanges_restaurantId_idx" ON "currency_exchanges"("restaurantId");

-- AddForeignKey
ALTER TABLE "currency_exchanges" ADD CONSTRAINT "currency_exchanges_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
