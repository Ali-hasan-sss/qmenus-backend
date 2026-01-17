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
  console.error("  1. Create a .env file in backend/ with DATABASE_URL");
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

async function applyMigration() {
  const prisma = new PrismaClient();

  try {
    console.log("🔄 Applying discount to order_items migration...");

    // Check if column already exists
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_items' 
      AND column_name = 'discount'
    `;

    if (Array.isArray(tableInfo) && tableInfo.length > 0) {
      console.log("✅ Column 'discount' already exists. Migration already applied.");
      return;
    }

    // Apply migration SQL
    await prisma.$executeRaw`
      ALTER TABLE "order_items" 
      ADD COLUMN IF NOT EXISTS "discount" DECIMAL(5,2);
    `;

    console.log("✅ Migration applied successfully!");
    console.log("   - Added 'discount' column (DECIMAL(5,2), nullable) to 'order_items' table");
  } catch (error) {
    if (error.message && error.message.includes("already exists")) {
      console.log("✅ Column already exists. Migration already applied.");
    } else {
      console.error("❌ Error applying migration:", error.message);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => {
    console.log("✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
