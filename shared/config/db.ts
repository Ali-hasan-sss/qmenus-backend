// Import PrismaClient from the generated client in shared's node_modules
// This ensures we always use the Prisma Client from shared that includes all models
// We use require.resolve to find the correct path at runtime, which works from both
// source (backend/shared/config/) and compiled (dist/shared/config/) locations
import path from "path";

// Try to resolve Prisma Client from shared/node_modules
// Works from both source and compiled locations
let PrismaClient: any;
try {
  // Try the path relative to compiled location first (dist/shared/config/)
  const compiledPath = path.resolve(
    __dirname,
    "../../../../shared/node_modules/@prisma/client"
  );
  PrismaClient = require(compiledPath).PrismaClient;
} catch {
  // Fallback to path relative to source location (backend/shared/config/)
  const sourcePath = path.resolve(__dirname, "../node_modules/@prisma/client");
  PrismaClient = require(sourcePath).PrismaClient;
}

const prisma = new PrismaClient();

export default prisma;
export type { PrismaClient };
