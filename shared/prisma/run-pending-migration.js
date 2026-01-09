const path = require("path");
const fs = require("fs");

// Try multiple possible paths for .env file (prioritize backend/.env)
const envPaths = [
  path.join(__dirname, "../../.env"), // backend/.env
  path.join(__dirname, "../../../.env"), // backend/.env (alternative)
  path.join(__dirname, "../../api-service/.env"), // api-service/.env (fallback)
  path.join(process.cwd(), ".env"), // Current working directory
  path.join(process.cwd(), "../.env"), // Parent directory
  path.join(process.cwd(), "../api-service/.env"), // api-service/.env (fallback)
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    console.log(`✅ Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

// Also try loading from environment variables directly
if (!process.env.DATABASE_URL && !envLoaded) {
  console.error(
    "❌ Could not find .env file or DATABASE_URL environment variable."
  );
  console.error("Please either:");
  console.error(
    "  1. Create a .env file in backend/api-service/ with DATABASE_URL"
  );
  console.error("  2. Set DATABASE_URL as an environment variable");
  console.error("\nTried paths:");
  envPaths.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables.");
  process.exit(1);
}
const { PrismaClient } = require("@prisma/client");

async function runMigration() {
  const prisma = new PrismaClient();

  try {
    console.log(
      "🔄 Running migration to add PENDING to KitchenItemStatus enum..."
    );

    // Check if PENDING already exists in enum
    const checkEnum = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"KitchenItemStatus")) as value;
    `;

    const enumValues = checkEnum.map((row) => row.value);
    console.log("📋 Current enum values:", enumValues);

    if (enumValues.includes("PENDING")) {
      console.log("✅ PENDING already exists in enum. Skipping enum update.");
    } else {
      // Add PENDING to enum
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "KitchenItemStatus" ADD VALUE IF NOT EXISTS 'PENDING';`
      );
      console.log("✅ Added PENDING to KitchenItemStatus enum");
    }

    // Change default value
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "order_items" ALTER COLUMN "kitchenItemStatus" SET DEFAULT 'PENDING';`
    );
    console.log("✅ Changed default value to PENDING");

    // Update existing items
    const updateResult = await prisma.$executeRawUnsafe(`
      UPDATE "order_items" 
      SET "kitchenItemStatus" = 'PENDING' 
      WHERE "kitchenItemStatus" = 'PREPARING' 
      AND "orderId" IN (
        SELECT "id" FROM "orders" 
        WHERE "status" IN ('PENDING', 'PREPARING')
      );
    `);
    console.log(`✅ Updated existing items: ${updateResult} rows affected`);

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error running migration:", error.message);
    if (error.message.includes("IF NOT EXISTS")) {
      // PostgreSQL version might not support IF NOT EXISTS for ALTER TYPE
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TYPE "KitchenItemStatus" ADD VALUE 'PENDING';`
        );
        console.log(
          "✅ Added PENDING to KitchenItemStatus enum (without IF NOT EXISTS)"
        );
      } catch (e) {
        if (e.message.includes("already exists")) {
          console.log("✅ PENDING already exists in enum");
        } else {
          throw e;
        }
      }
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

runMigration()
  .then(() => {
    console.log("🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
