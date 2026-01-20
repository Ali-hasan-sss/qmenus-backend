import express from "express";

/**
 * Helper function to get client IP address (handles proxy headers correctly)
 * This ensures that requests from different devices behind the same proxy
 * are tracked separately by extracting the original client IP from proxy headers.
 * 
 * Priority order:
 * 1. CF-Connecting-IP header (Cloudflare - most reliable when behind Cloudflare)
 * 2. X-Real-IP header (set by Nginx when configured correctly)
 * 3. X-Forwarded-For header (last IP first, then first IP)
 * 4. req.ip (Express trust proxy)
 * 5. req.socket.remoteAddress (fallback)
 * 
 * @param req Express request object
 * @returns Client IP address as string
 */
export const getClientIp = (req: express.Request): string => {
  // Priority 1: CF-Connecting-IP (Cloudflare) - most reliable when behind Cloudflare
  const cfIp = req.headers["cf-connecting-ip"];
  if (cfIp) {
    const cfIpString = Array.isArray(cfIp) ? cfIp[0] : cfIp;
    if (cfIpString && cfIpString !== "" && cfIpString !== "unknown") {
      return cfIpString;
    }
  }

  // Priority 2: x-real-ip header (set by Nginx when configured correctly)
  // This is more reliable than x-forwarded-for when behind a single proxy
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    const realIpString = Array.isArray(realIp) ? realIp[0] : realIp;
    if (realIpString && realIpString !== "" && realIpString !== "unknown") {
      return realIpString;
    }
  }

  // Priority 3: x-forwarded-for header (check last IP first, then first IP)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const forwardedString = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ips = forwardedString.split(",").map(ip => ip.trim());
    
    // If multiple IPs, the last one is usually the original client (unless there's a proxy chain)
    // But if we're behind Cloudflare -> Nginx, the first one might be the real client
    // Try last first (more likely to be real client in proxy chain), then first
    const lastIp = ips[ips.length - 1];
    if (lastIp && lastIp !== "" && lastIp !== "unknown") {
      return lastIp;
    }
    
    const firstIp = ips[0];
    if (firstIp && firstIp !== "" && firstIp !== "unknown") {
      return firstIp;
    }
  }
  
  // Priority 4: req.ip (works with trust proxy enabled)
  if (req.ip && req.ip !== "" && req.ip !== "unknown") {
    return req.ip;
  }
  
  // Priority 5: req.socket.remoteAddress (fallback)
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }
  
  // Last resort: return unknown
  console.warn("⚠️ Could not determine client IP from request:", {
    "cf-connecting-ip": req.headers["cf-connecting-ip"],
    "x-forwarded-for": req.headers["x-forwarded-for"],
    "x-real-ip": req.headers["x-real-ip"],
    "req.ip": req.ip,
    "req.socket.remoteAddress": req.socket?.remoteAddress,
  });
  return "unknown";
};
