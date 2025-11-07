"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || "5000",
    API_PORT: process.env.API_PORT || "5000",
    SOCKET_PORT: process.env.SOCKET_PORT || "5001",
    JOBS_PORT: process.env.JOBS_PORT || "5002",
    DATABASE_URL: process.env.DATABASE_URL || "",
    JWT_SECRET: process.env.JWT_SECRET || "",
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
    RESEND_API_KEY: process.env.RESEND_API_KEY || "",
};
