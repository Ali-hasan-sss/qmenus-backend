import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { env } from "../../shared/config/env";
import prisma from "../../shared/config/db";
import { getClientIp } from "./helpers/ipHelpers";

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
    console.log("🌐 CORS allowed origins:", env.ALLOWED_ORIGINS);
    return env.ALLOWED_ORIGINS;
  }

  const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";
  console.log("🌐 CORS using FRONTEND_URL:", frontendUrl);
  return [frontendUrl];
};

const allowedOrigins = getAllowedOrigins();
console.log("🔒 CORS configuration:", {
  isProduction: isProd,
  allowedOrigins: Array.isArray(allowedOrigins)
    ? allowedOrigins
    : "all origins",
  credentials: true,
});

// Enhanced CORS middleware with better logging
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log("🌐 CORS middleware hit:", {
    method: req.method,
    path: req.path,
    origin: origin || "no origin",
    "x-forwarded-for": req.headers["x-forwarded-for"],
    "x-forwarded-proto": req.headers["x-forwarded-proto"],
  });
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        console.log("⚠️ CORS: No origin header, allowing request");
        return callback(null, true);
      }

      // Normalize origin by extracting only the base URL (protocol + host + port)
      // This handles cases where the origin header incorrectly includes a path
      let normalizedOrigin = origin;
      try {
        const url = new URL(origin);
        normalizedOrigin = `${url.protocol}//${url.host}`;
        if (normalizedOrigin !== origin) {
          console.log(`🔄 Normalized origin: ${origin} -> ${normalizedOrigin}`);
        }
      } catch (e) {
        // If URL parsing fails, use origin as-is
        console.log(`⚠️ Failed to parse origin: ${origin}`);
      }

      const origins = getAllowedOrigins();
      console.log("🔍 CORS check:", {
        requestOrigin: origin,
        normalizedOrigin: normalizedOrigin,
        allowedOrigins: origins,
        isArray: Array.isArray(origins),
      });

      if (origins === true) {
        // Development: allow all origins
        console.log("✅ CORS: Development mode - allowing all origins");
        return callback(null, true);
      }

      // Check both the original and normalized origin
      const isAllowed =
        Array.isArray(origins) &&
        (origins.includes(origin) || origins.includes(normalizedOrigin));

      if (isAllowed) {
        console.log("✅ CORS allowed for origin:", normalizedOrigin);
        return callback(null, normalizedOrigin); // Return normalized origin
      }

      console.log("❌ CORS blocked for origin:", origin);
      console.log("   Normalized origin:", normalizedOrigin);
      console.log("   Allowed origins:", origins);
      console.log("   Origin match:", isAllowed);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["Set-Cookie"], // Explicitly expose Set-Cookie
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

// Rate limiting - configured for real-world restaurant usage
// Each restaurant may have multiple devices (POS, tablets, phones) making requests
// Typical usage: 50-200 requests per 15 minutes per device
// With multiple devices per restaurant: 200-500 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per 15 minutes (suitable for restaurant with multiple devices)
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req: express.Request) => {
    // Use IP address for rate limiting (handles proxy correctly)
    // This ensures requests from different devices behind the same proxy are tracked separately
    return getClientIp(req);
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health" || req.path === "/api/health";
  },
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false, // Count failed requests too
  handler: (req: express.Request, res: express.Response) => {
    // Custom handler to ensure proper JSON response
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
    });
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
