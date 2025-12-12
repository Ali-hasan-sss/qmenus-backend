const { execSync } = require("child_process");
const path = require("path");

const services = [
  { name: "api-service", cwd: "./api-service" },
  { name: "socket-service", cwd: "./socket-service" },
  { name: "jobs-service", cwd: "./jobs-service" },
];

console.log("🔨 Building all services...\n");

// Generate Prisma client first
console.log("📦 Generating Prisma client...");
try {
  execSync("npx prisma generate", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
  console.log("✅ Prisma client generated\n");
} catch (error) {
  console.error("❌ Failed to generate Prisma client");
  process.exit(1);
}

// Build each service
services.forEach(({ name, cwd }) => {
  console.log(`🔨 Building ${name}...`);
  try {
    execSync("npm run build", {
      stdio: "inherit",
      cwd: path.join(__dirname, "..", cwd),
    });
    console.log(`✅ ${name} built successfully\n`);
  } catch (error) {
    console.error(`❌ Failed to build ${name}`);
    process.exit(1);
  }
});

console.log("✅ All services built successfully!");
