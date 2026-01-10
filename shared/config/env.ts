import dotenv from "dotenv";

// Try to load .env from backend root directory
// dotenv.config() will automatically look for .env in:
// 1. Current working directory
// 2. Parent directories (up the tree)
// 3. backend/.env (via process.cwd() when running from backend/)

// First, try to load from backend/.env explicitly
try {
  // Try common paths for backend/.env
  const possiblePaths = [
    ".env", // Current directory
    "../.env", // Parent directory
    "../../.env", // Grandparent directory
  ];

  let loaded = false;
  for (const envPath of possiblePaths) {
    try {
      const result = dotenv.config({ path: envPath });
      if (!result.error) {
        loaded = true;
        break;
      }
    } catch {
      // Continue to next path
    }
  }

  // Fallback: try default dotenv.config()
  if (!loaded) {
    dotenv.config();
  }
} catch {
  // If all fails, use default
  dotenv.config();
}

// Parse allowed origins from environment variable
// Supports comma-separated list: "https://example.com,https://www.example.com"
const parseAllowedOrigins = (): string[] => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  if (allowedOrigins) {
    return allowedOrigins.split(",").map((origin) => origin.trim()).filter(Boolean);
  }
  
  // Fallback to FRONTEND_URL if ALLOWED_ORIGINS is not set
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return [frontendUrl];
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || "5000",
  API_PORT: process.env.API_PORT || "5000",
  SOCKET_PORT: process.env.SOCKET_PORT || "5001",
  JOBS_PORT: process.env.JOBS_PORT || "5002",
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  ALLOWED_ORIGINS: parseAllowedOrigins(),
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  SOCKET_SERVICE_URL: process.env.SOCKET_SERVICE_URL || "",
  REDIS_URL: process.env.REDIS_URL || "",
};
