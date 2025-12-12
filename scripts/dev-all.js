const { spawn } = require("child_process");
const path = require("path");

const services = [
  { name: "api-service", cwd: "./api-service", port: 5000 },
  { name: "socket-service", cwd: "./socket-service", port: 5001 },
  { name: "jobs-service", cwd: "./jobs-service", port: 5002 },
];

const procs = [];

console.log("🚀 Starting all services in development mode...\n");

function startService({ name, cwd, port }) {
  console.log(`📦 Starting ${name} on port ${port}...`);
  const cmd = "npm run dev";
  const child = spawn(cmd, {
    cwd: path.join(__dirname, "..", cwd),
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || "development",
      PORT: port,
    },
  });

  child.on("exit", (code, signal) => {
    console.log(`\n⚠️  [${name}] exited with code ${code} signal ${signal}`);
  });

  child.on("error", (error) => {
    console.error(`\n❌ [${name}] Error:`, error.message);
  });

  procs.push({ name, process: child });
}

function shutdown() {
  console.log("\n\n🛑 Shutting down all services...");
  procs.forEach(({ name, process: p }) => {
    if (p && !p.killed) {
      try {
        console.log(`   Stopping ${name}...`);
        p.kill("SIGINT");
      } catch (error) {
        console.error(`   Error stopping ${name}:`, error.message);
      }
    }
  });
  // Give children a moment to exit gracefully
  setTimeout(() => {
    console.log("✅ All services stopped");
    process.exit(0);
  }, 1000);
}

// Handle graceful shutdown
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start all services
services.forEach(startService);

console.log("\n✅ All services started!");
console.log("📝 Press Ctrl+C to stop all services\n");
