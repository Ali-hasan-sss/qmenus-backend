const path = require("path");
const fs = require("fs");

// Try multiple possible paths for .env file
const envPaths = [
  path.join(__dirname, "../../.env"), // backend/.env
  path.join(__dirname, "../../../.env"), // backend/.env (alternative)
  path.join(process.cwd(), ".env"), // Current working directory
  path.join(process.cwd(), "../.env"), // Parent directory
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

// Fallback: try default dotenv.config() if no file found
if (!envLoaded) {
  require("dotenv").config();
}
const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const path = require("path");

async function checkAndSeed() {
  let prisma;

  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log("⚠️ DATABASE_URL not found. Skipping seed check...");
      return;
    }

    console.log("🔍 Checking if database needs migrations...");

    // Run migrations first to ensure tables exist
    try {
      console.log("🔄 Running database migrations...");
      execSync("npm run migrate:deploy", {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
      });
      console.log("✅ Migrations completed successfully!");
    } catch (error) {
      console.error("❌ Error running migrations:", error.message);
      console.log("⚠️ Continuing without migrations...");
    }

    console.log("🔍 Checking if database needs seeding...");

    // Initialize Prisma Client
    prisma = new PrismaClient();

    // Verify Prisma Client is properly initialized
    if (!prisma || !prisma.user) {
      console.log(
        "⚠️ Prisma Client not properly initialized. Running seed anyway..."
      );
      const seedPath = path.join(__dirname, "../../shared/prisma/seed.js");
      try {
        execSync(`node ${seedPath}`, { stdio: "inherit" });
        console.log("✅ Seeding completed successfully!");
      } catch (error) {
        console.error("❌ Error running seed:", error.message);
      }
      return;
    }

    // Test database connection
    try {
      await prisma.$connect();
      console.log("✅ Database connection established");
    } catch (error) {
      console.log("⚠️ Could not connect to database:", error.message);
      console.log("⚠️ Continuing without seed check...");
      return;
    }

    // Check if admin user exists
    let adminCount = 0;
    let planCount = 0;

    try {
      adminCount = await prisma.user.count({
        where: { email: "admin@gmail.com" },
      });
    } catch (error) {
      console.log("⚠️ Could not check admin user:", error.message);
    }

    // Check if any plans exist
    try {
      planCount = await prisma.subscriptionPlan.count();
    } catch (error) {
      console.log("⚠️ Could not check plans:", error.message);
    }

    if (adminCount === 0 || planCount === 0) {
      console.log("📦 Database needs seeding. Running seed...");

      const seedPath = path.join(__dirname, "../../shared/prisma/seed.js");
      try {
        execSync(`node ${seedPath}`, { stdio: "inherit" });
        console.log("✅ Seeding completed successfully!");
      } catch (error) {
        console.error("❌ Error running seed:", error.message);
        // Try using prisma db seed as fallback
        try {
          execSync("npm run db:seed", {
            stdio: "inherit",
            cwd: path.join(__dirname, ".."),
          });
          console.log("✅ Seeding completed using prisma db seed!");
        } catch (fallbackError) {
          console.error(
            "❌ Fallback seeding also failed:",
            fallbackError.message
          );
        }
      }
    } else {
      console.log("✅ Database already seeded. Skipping...");
    }
  } catch (error) {
    console.error("❌ Error checking database:", error.message);
    console.log("⚠️ Continuing without seeding...");
  } finally {
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    }
  }
}

// Run check and seed
checkAndSeed()
  .then(() => {
    console.log("🚀 Starting application...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
