import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { env } from "../../shared/config/env";
import prisma from "../../shared/config/db";

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
import excelImportRoutes from "./routes/excelImport";
import galleryRoutes from "./routes/gallery";
import publicRoutes from "./routes/public";
import sectionRoutes from "./routes/section";
import kitchenRoutes from "./routes/kitchen";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

const app = express();

// Trust proxy for production
app.set("trust proxy", 1);

// CORS configuration - supports multiple origins
const isProd = env.NODE_ENV === "production";
const getAllowedOrigins = (): string[] | boolean => {
  if (!isProd) {
    return true; // Allow all origins in development
  }

  // Use ALLOWED_ORIGINS if set, otherwise fallback to FRONTEND_URL
  if (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.length > 0) {
    return env.ALLOWED_ORIGINS;
  }

  return [env.FRONTEND_URL || "http://localhost:3000"];
};

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    optionsSuccessStatus: 204,
  })
);

// Security middleware - configure helmet to allow cookies
app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http:", "https:", "ws:", "wss:"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

// Rate limiting - increased for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health";
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Logging
app.use(morgan("dev"));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "api",
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/menu-theme", menuThemeRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/order", orderRoutes); // Also mount under singular form for compatibility
app.use("/api/qr", qrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/excel-import", excelImportRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/section", sectionRoutes);
app.use("/api/kitchen", kitchenRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const port = env.API_PORT || env.PORT;
app.listen(port, () => {
  console.log(`[api-service] running on port ${port}`);
  console.log(`[api-service] environment: ${env.NODE_ENV}`);
});
