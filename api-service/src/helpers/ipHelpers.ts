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
  // Priority 1: x-forwarded-for header (most reliable when properly configured)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs in a chain
    // Format: "client-ip, proxy1-ip, proxy2-ip"
    // We want the first one (original client IP)
    const forwardedString = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const firstIp = forwardedString.split(",")[0].trim();
    
    // Validate IP format (basic check)
    if (firstIp && firstIp !== "" && firstIp !== "unknown") {
      return firstIp;
    }
  }
  
  // Priority 2: x-real-ip header (set by Nginx when configured)
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    const realIpString = Array.isArray(realIp) ? realIp[0] : realIp;
    if (realIpString && realIpString !== "" && realIpString !== "unknown") {
      return realIpString;
    }
  }
  
  // Priority 3: req.ip (works with trust proxy enabled)
  if (req.ip && req.ip !== "" && req.ip !== "unknown") {
    return req.ip;
  }
  
  // Priority 4: req.socket.remoteAddress (fallback)
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }
  
  // Last resort: return unknown
  console.warn("⚠️ Could not determine client IP from request:", {
    "x-forwarded-for": req.headers["x-forwarded-for"],
    "x-real-ip": req.headers["x-real-ip"],
    "req.ip": req.ip,
    "req.socket.remoteAddress": req.socket?.remoteAddress,
  });
  return "unknown";
};
