const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Check if PM2 is installed
try {
  execSync("pm2 --version", { stdio: "ignore" });
} catch (error) {
  console.error("❌ PM2 is not installed. Please install it first:");
  console.error("   npm install -g pm2");
  console.error("   or");
  console.error("   npm install pm2 --save-dev");
  process.exit(1);
}

// Check if services are built
const services = [
  { name: "api-service", dist: "./api-service/dist/app.js" },
  { name: "socket-service", dist: "./socket-service/dist/socketServer.js" },
  { name: "jobs-service", dist: "./jobs-service/dist/index.js" },
];

console.log("🔍 Checking if services are built...\n");

const missingBuilds = [];
services.forEach(({ name, dist }) => {
  const distPath = path.join(__dirname, "..", dist);
  if (!fs.existsSync(distPath)) {
    missingBuilds.push(name);
    console.log(`❌ ${name} is not built (missing: ${dist})`);
  } else {
    console.log(`✅ ${name} is built`);
  }
});

if (missingBuilds.length > 0) {
  console.error("\n❌ Some services are not built!");
  console.error("Missing services:", missingBuilds.join(", "));
  console.error(
    "\n💡 In Docker/production, services must be built during image build."
  );
  console.error(
    "   Please rebuild the Docker image or run: npm run build:all\n"
  );
  process.exit(1);
}

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log("📁 Created logs directory\n");
}

// Start services with PM2
console.log("🚀 Starting all services with PM2...\n");

try {
  // Stop existing PM2 processes if any
  try {
    execSync("pm2 delete ecosystem.config.js", { stdio: "ignore" });
  } catch (error) {
    // Ignore if no processes exist
  }

  // Start all services
  execSync("pm2 start ecosystem.config.js", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });

  console.log("\n✅ All services started successfully!");
  console.log("\n📊 View status: pm2 status");
  console.log("📋 View logs: pm2 logs");
  console.log("🛑 Stop all: npm run stop:prod");
  console.log("🔄 Restart all: pm2 restart ecosystem.config.js\n");
} catch (error) {
  console.error("\n❌ Failed to start services:", error.message);
  process.exit(1);
}
