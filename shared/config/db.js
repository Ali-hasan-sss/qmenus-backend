"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import PrismaClient from the generated client in shared's node_modules
// This ensures we always use the Prisma Client from shared that includes all models
// We use a relative path to ensure we use the correct Prisma Client even if the service
// has its own @prisma/client in node_modules
const client_1 = require("../node_modules/@prisma/client");
const prisma = new client_1.PrismaClient();
exports.default = prisma;
