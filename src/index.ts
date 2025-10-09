import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cron from "node-cron";

// Import routes
import authRoutes from "./routes/auth";
import restaurantRoutes from "./routes/restaurant";
import menuRoutes from "./routes/menu";
import categoryRoutes from "./routes/categories";
import menuThemeRoutes from "./routes/menuTheme";
import orderRoutes from "./routes/order";
import qrRoutes from "./routes/qr";
import adminRoutes from "./routes/admin";
import notificationsRoutes from "./routes/notifications";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

// Import socket handlers
import { setupSocketHandlers } from "./socket/orderHandlers";

// Import subscription helpers
import { runDailySubscriptionChecks } from "./helpers/subscriptionHelpers";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 5000;

// Trust proxy for Render (fixes rate limiting issues)
app.set("trust proxy", 1);

// CORS configuration - Allow only FRONTEND_URL origin
// Secure configuration for production use

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Security middleware
app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "60000"), // 1 minute
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "5"), // 5 requests per minute for auth routes
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.GENERAL_RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.GENERAL_RATE_LIMIT_MAX_REQUESTS || "200"), // 200 requests per 15 minutes for general routes
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const publicLimiter = rateLimit({
  windowMs: parseInt(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.PUBLIC_RATE_LIMIT_MAX_REQUESTS || "1000"), // 1000 requests per 15 minutes for public routes
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const orderTrackingLimiter = rateLimit({
  windowMs: parseInt(
    process.env.ORDER_TRACKING_RATE_LIMIT_WINDOW_MS || "60000"
  ), // 1 minute
  max: parseInt(process.env.ORDER_TRACKING_RATE_LIMIT_MAX_REQUESTS || "30"), // 30 requests per minute for order tracking
  message: "Too many order tracking requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply different rate limiting to different route groups
app.use("/api/auth/", authLimiter); // 5 requests per minute
app.use("/api/restaurant/", generalLimiter); // 200 requests per 15 minutes
app.use("/api/menu/", generalLimiter); // 200 requests per 15 minutes
app.use("/api/menu/categories/", generalLimiter); // 200 requests per 15 minutes
app.use("/api/qr/", generalLimiter); // 200 requests per 15 minutes
app.use("/api/admin/", generalLimiter); // 200 requests per 15 minutes
app.use("/api/upload/", generalLimiter); // 200 requests per 15 minutes
app.use("/api/public/", publicLimiter); // 1000 requests per 15 minutes

// Special rate limiting for order routes
app.use("/api/order/track/", orderTrackingLimiter); // 30 requests per minute for tracking
app.use("/api/order/", generalLimiter); // 200 requests per 15 minutes for other order operations

// Logging
app.use(morgan("combined"));

// Cookie parsing middleware
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/menu/categories", categoryRoutes); // Move before /api/menu
app.use("/api/menu", menuRoutes);
app.use("/api/menu-theme", menuThemeRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationsRoutes);

// Public menu route (no authentication required)
import publicRoutes from "./routes/public";
app.use("/api/public", publicRoutes);

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `📱 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`
  );
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🌐 CORS: Allowing origin: ${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }`
  );

  // Schedule daily subscription checks at 9:00 AM Damascus time
  const dailyCheckTask = cron.schedule(
    "0 9 * * *",
    () => {
      console.log("⏰ Running scheduled daily subscription checks...");
      runDailySubscriptionChecks(io);
    },
    {
      timezone: "Asia/Damascus",
    }
  );

  console.log("✅ Daily subscription check scheduled: 9:00 AM Damascus time");

  // Run initial subscription check on startup
  console.log("🔍 Running initial subscription check...");
  runDailySubscriptionChecks(io);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

export { io };
