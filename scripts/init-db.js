const { execSync } = require("child_process");
const path = require("path");

console.log("🚀 Initializing database...\n");

const rootDir = path.join(__dirname, "..");

try {
  // Step 1: Generate Prisma Client
  console.log("📦 Step 1: Generating Prisma Client...");
  execSync("npx prisma generate --schema ./prisma/schema.prisma", {
    stdio: "inherit",
    cwd: rootDir,
  });
  console.log("✅ Prisma Client generated\n");

  // Step 2: Run migrations
  console.log("🗄️  Step 2: Running database migrations...");
  execSync("npm run db:deploy", {
    stdio: "inherit",
    cwd: rootDir,
  });
  console.log("✅ Migrations completed\n");

  // Step 3: Run seeding (create admin and plans)
  console.log("🌱 Step 3: Seeding database (admin user and plans)...");
  try {
    // Try using compiled seed.js first (faster)
    execSync("node prisma/seed.js", {
      stdio: "inherit",
      cwd: rootDir,
    });
  } catch (error) {
    // Fallback to ts-node if seed.js doesn't exist
    console.log("⚠️  seed.js not found, trying with ts-node...");
    execSync("npm run db:seed", {
      stdio: "inherit",
      cwd: rootDir,
    });
  }
  console.log("✅ Database seeded successfully\n");

  console.log("✅ Database initialization completed!");
  console.log("\n📋 Summary:");
  console.log("  - Admin user created: admin@gmail.com / admin123");
  console.log("  - Plans created: Free Trial, Basic, Premium, Enterprise");
  console.log("\n⚠️  Please change the admin password after first login!\n");
} catch (error) {
  console.error("\n❌ Database initialization failed:", error.message);
  process.exit(1);
}
