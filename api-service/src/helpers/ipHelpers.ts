import express from "express";

/**
 * Helper function to get client IP address (handles proxy headers correctly)
 * This ensures that requests from different devices behind the same proxy
 * are tracked separately by extracting the original client IP from proxy headers.
 * 
 * Priority order:
 * 1. x-forwarded-for header (first IP in the chain - original client)
 * 2. x-real-ip header (set by proxy)
 * 3. req.ip (Express trust proxy)
 * 4. req.socket.remoteAddress (fallback)
 * 
 * @param req Express request object
 * @returns Client IP address as string
 */
export const getClientIp = (req: express.Request): string => {
  // Check for proxy headers (in order of priority)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs in a chain
    // Format: "client-ip, proxy1-ip, proxy2-ip"
    // We want the first one (original client IP)
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(",")[0].trim();
  }
  
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  // Fallback to req.ip (requires app.set('trust proxy', true))
  // or req.socket.remoteAddress
  return req.ip || req.socket.remoteAddress || "unknown";
};
