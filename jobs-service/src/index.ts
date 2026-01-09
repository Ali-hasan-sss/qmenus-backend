import cron from "node-cron";
import express from "express";
import { env } from "../../shared/config/env";
import { runDailySubscriptionChecks } from "./tasks/subscriptionHelpers";

console.log("[jobs-service] starting...");

// Create Express app for health checks
const app = express();

// Health check endpoint
app.get("/health", (_req: express.Request, res: express.Response) => {
  res.json({
    ok: true,
    service: "jobs",
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Start health check server
const port = env.JOBS_PORT || env.PORT || 5002;
app.listen(port, () => {
  console.log(`[jobs-service] health check server running on port ${port}`);
});

// Health check function
const healthCheck = () => {
  console.log(
    `[jobs-service] health check - running on port ${env.JOBS_PORT || 5002}`
  );
};

// Schedule daily subscription checks at 9:00 AM Damascus time
const dailyCheckTask = cron.schedule(
  "0 9 * * *",
  async () => {
    console.log("⏰ Running scheduled daily subscription checks...");
    try {
      await runDailySubscriptionChecks();
    } catch (error) {
      console.error("❌ Error running daily subscription checks:", error);
    }
  },
  {
    timezone: "Asia/Damascus",
  }
);

console.log("✅ Daily subscription check scheduled: 9:00 AM Damascus time");

// Run initial subscription check on startup
console.log("🔍 Running initial subscription check...");
runDailySubscriptionChecks().catch((error) => {
  console.error("❌ Error running initial subscription check:", error);
});

healthCheck();

// Keep the service running
setInterval(() => {
  console.log("[jobs-service] heartbeat");
}, 60000);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[jobs-service] SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[jobs-service] SIGINT received, shutting down gracefully");
  process.exit(0);
});
