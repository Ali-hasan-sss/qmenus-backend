const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log("🔄 Applying currency exchange migration...");

    // Check if table already exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'currency_exchanges'
      );
    `;

    if (tableExists[0].exists) {
      console.log(
        "✅ Table currency_exchanges already exists. Skipping creation."
      );
    } else {
      // Create table
      await prisma.$executeRawUnsafe(`
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
      `);
      console.log("✅ Table created!");

      // Create unique index
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX "currency_exchanges_restaurantId_currency_key" 
        ON "currency_exchanges"("restaurantId", "currency");
      `);
      console.log("✅ Unique index created!");

      // Create index
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "currency_exchanges_restaurantId_idx" 
        ON "currency_exchanges"("restaurantId");
      `);
      console.log("✅ Index created!");

      // Add foreign key
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "currency_exchanges" 
        ADD CONSTRAINT "currency_exchanges_restaurantId_fkey" 
        FOREIGN KEY ("restaurantId") 
        REFERENCES "restaurants"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      console.log("✅ Foreign key created!");
    }

    // Mark migration as applied in _prisma_migrations table
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
      VALUES (gen_random_uuid()::text, '', NOW(), '20250127000000_add_currency_exchange', NULL, NULL, NOW(), 1)
      ON CONFLICT DO NOTHING;
    `;
    console.log("✅ Migration marked as applied!");
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    if (
      error.message.includes("already exists") ||
      error.message.includes("duplicate key")
    ) {
      console.log("⚠️  Table or migration already exists. Continuing...");
    } else {
      console.error("❌ Error:", error.message);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => {
    console.log("🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
