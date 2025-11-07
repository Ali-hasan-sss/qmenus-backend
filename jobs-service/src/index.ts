import cron from "node-cron";
import express from "express";
import { env } from "../../shared/config/env";
import prisma from "../../shared/config/db";

console.log("[jobs-service] starting...");

// Create Express app for health checks
const app = express();

// Health check endpoint
app.get("/health", (_req, res) => {
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

// TODO: Import subscription helpers from tasks/subscriptionHelpers.ts
// import { runDailySubscriptionChecks } from './tasks/subscriptionHelpers';

// Health check function
const healthCheck = () => {
  console.log(
    `[jobs-service] health check - running on port ${env.JOBS_PORT || 5002}`
  );
};

// TODO: Schedule cron jobs here (migrated from legacy backend/src/index.ts)
// - Daily subscription checks at 9:00 AM Damascus time
// - Email reminders
// - Cleanup tasks

// Example cron job structure (to be uncommented after migration):
/*
const dailyCheckTask = cron.schedule(
  "0 9 * * *",
  () => {
    console.log("⏰ Running scheduled daily subscription checks...");
    // runDailySubscriptionChecks();
  },
  {
    timezone: "Asia/Damascus",
  }
);

console.log("✅ Daily subscription check scheduled: 9:00 AM Damascus time");

// Run initial subscription check on startup
console.log("🔍 Running initial subscription check...");
// runDailySubscriptionChecks();
*/

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
