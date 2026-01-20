import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../../shared/config/db";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    restaurantId?: string;
  };
  file?: Express.Multer.File;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  console.log("🔐 Auth middleware hit for:", req.url);
  console.log("🍪 Available cookies:", req.cookies);
  console.log("🔑 Authorization header:", req.header("Authorization"));

  try {
    // Try to get token from httpOnly cookie first, then from Authorization header
    const token =
      req.cookies["auth-token"] ||
      req.header("Authorization")?.replace("Bearer ", "");

    console.log("🎫 Token found:", !!token);

    if (!token) {
      console.log("❌ No token found in cookies or headers");
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        restaurants: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found.",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurants?.[0]?.id,
    };

    console.log("✅ Auth successful for user:", {
      id: user.id,
      email: user.email,
      role: user.role,
      hasRestaurant: !!user.restaurants?.[0],
    });

    return next();
  } catch (error) {
    console.error("❌ Auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log("🔐 Authorize middleware hit for:", req.url);
    console.log("User role:", req.user?.role);
    console.log("Required roles:", roles);

    if (!req.user) {
      console.log("❌ No user found in request");
      return res.status(401).json({
        success: false,
        message: "Access denied. Please authenticate first.",
      });
    }

    if (!roles.includes(req.user.role)) {
      console.log(
        "❌ Insufficient permissions. User role:",
        req.user.role,
        "Required:",
        roles
      );
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    console.log("✅ Authorization successful");
    return next();
  };
};

export const requireRestaurant = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  console.log("🏪 RequireRestaurant middleware hit for:", req.url);
  if (!req.user?.restaurantId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Restaurant access required.",
    });
  }
  return next();
};

// Middleware to check if restaurant is active and has active subscription
export const requireActiveRestaurant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("🏪 RequireActiveRestaurant middleware hit for:", req.url);
    
    if (!req.user?.restaurantId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Restaurant access required.",
      });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.user.restaurantId },
      include: {
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
        },
      },
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Check if restaurant is active
    if (!restaurant.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your restaurant account has been deactivated. Please contact support or renew your subscription.",
        messageAr: "تم تعطيل حساب المطعم الخاص بك. يرجى الاتصال بالدعم أو تجديد اشتراكك.",
        requiresSubscription: true,
      });
    }

    // Check if restaurant has active subscription
    if (!restaurant.subscriptions || restaurant.subscriptions.length === 0) {
      // Auto-deactivate restaurant if no active subscription
      await prisma.restaurant.update({
        where: { id: req.user.restaurantId },
        data: { isActive: false },
      });
      
      return res.status(403).json({
        success: false,
        message: "Your subscription has expired. Please renew your subscription to continue using the service.",
        messageAr: "انتهى اشتراكك. يرجى تجديد اشتراكك لمتابعة استخدام الخدمة.",
        requiresSubscription: true,
      });
    }

    console.log("✅ Restaurant is active and has active subscription");
    return next();
  } catch (error) {
    console.error("❌ RequireActiveRestaurant error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};