const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function fixExchangeRateSize() {
  try {
    console.log("🔄 Fixing exchangeRate column size...");
    
    // Alter the column to DECIMAL(20, 6)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "currency_exchanges" 
      ALTER COLUMN "exchangeRate" TYPE DECIMAL(20, 6);
    `);
    
    console.log("✅ Column size updated successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixExchangeRateSize()
  .then(() => {
    console.log("🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
