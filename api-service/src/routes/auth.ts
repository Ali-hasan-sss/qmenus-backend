import express, { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import prisma from "../../../shared/config/db";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  createNotification,
  createNotificationByRole,
  createActivity,
} from "../helpers/subscriptionHelpers";
import { validateRequest } from "../middleware/validateRequest";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validators/authValidators";
import {
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/emailValidators";
import {
  generateVerificationCode,
  generateResetCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
  hashCode,
  testEmailSending,
} from "../helpers/emailHelpers";
import { getClientIp } from "../helpers/ipHelpers";

const router = express.Router();

// Rate limiting for login: 5 attempts per 5 minutes per IP
const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 5 minutes.",
    code: "LOGIN_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req: express.Request) => {
    // Use IP address for rate limiting (handles proxy)
    return getClientIp(req);
  },
  skipSuccessfulRequests: false, // Count all requests, including successful ones
  skipFailedRequests: false, // Count failed requests too
  handler: (req: express.Request, res: Response) => {
    // Custom handler to ensure proper JSON response with code
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again after 5 minutes.",
      code: "LOGIN_RATE_LIMIT_EXCEEDED",
    });
  },
});

// Register new user (enforce pre-verified email)
export const registerUser = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const {
      email: rawEmail,
      password,
      firstName,
      lastName,
      role,
      restaurantName,
      restaurantNameAr,
      restaurantDescription,
      restaurantDescriptionAr,
      logo,
    } = req.body;

    // Normalize email: convert to lowercase and trim whitespace
    const email = rawEmail ? rawEmail.trim().toLowerCase() : "";

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
        code: "USER_ALREADY_EXISTS",
      });
    }

    // Ensure email has been verified via EmailVerification table
    const emailVerification = await prisma.emailVerification.findUnique({
      where: { email },
    });

    if (
      !emailVerification ||
      emailVerification.verified !== true ||
      (emailVerification.expiresAt < new Date() && !emailVerification.verified)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email not verified. Please verify your email before creating an account.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user and restaurant in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role || "OWNER",
          emailVerified: true,
        },
      });

      // If user is an owner, create restaurant
      let restaurant = null;
      let subscription = null;

      if (role === "OWNER" || !role) {
        restaurant = await tx.restaurant.create({
          data: {
            name: restaurantName,
            nameAr: restaurantNameAr,
            description: restaurantDescription || null,
            descriptionAr: restaurantDescriptionAr || null,
            logo: logo || null,
            ownerId: user.id,
          },
        });

        // Get or create free trial plan
        let freeTrialPlan = await tx.plan.findFirst({
          where: { isFree: true },
        });

        if (!freeTrialPlan) {
          // Create free trial plan if it doesn't exist
          freeTrialPlan = await tx.plan.create({
            data: {
              name: "Free Trial",
              nameAr: "الخطة المجانية",
              description:
                "Free plan with basic features - 1 category, 5 items, 5 tables",
              descriptionAr:
                "خطة مجانية بميزات أساسية - فئة واحدة، 5 أصناف، 5 طاولات",
              type: "FREE",
              price: 0,
              currency: "SYP",
              duration: 0, // 0 means unlimited
              maxTables: 5,
              maxMenus: 1,
              maxCategories: 1,
              maxItems: 5,
              canCustomizeTheme: false,
              features: [
                "1 Category",
                "5 Items",
                "5 Tables",
                "No External Orders",
              ],
              isActive: true,
              isFree: true,
              creatorId: user.id,
            },
          });
        }

        // Create free trial subscription
        const startDate = new Date();
        let endDate = new Date();

        // For free plans (duration = 0), set end date to far future (10 years)
        if (freeTrialPlan.duration === 0) {
          endDate.setFullYear(endDate.getFullYear() + 10);
        } else {
          endDate.setDate(endDate.getDate() + freeTrialPlan.duration);
        }

        subscription = await tx.subscription.create({
          data: {
            restaurantId: restaurant.id,
            planId: freeTrialPlan.id,
            status: "ACTIVE",
            startDate,
            endDate,
          },
        });
      }

      return { user, restaurant, subscription };
    });

    // Generate JWT token
    const token = (jwt.sign as any)(
      {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "30d" } // Extended to 30 days
    );

    // Send welcome notification to restaurant owner
    console.log("🔍 Checking result:", {
      hasRestaurant: !!result.restaurant,
      restaurantId: result.restaurant?.id,
      restaurantName: result.restaurant?.name,
    });

    if (result.restaurant) {
      console.log(
        "🎉 Sending welcome notifications for restaurant:",
        result.restaurant.name
      );

      try {
        await createNotification(
          result.restaurant.id,
          "مرحباً بك في QMenus! 🎉",
          `مرحباً ${result.user.firstName}! تم إنشاء حساب مطعمك "${result.restaurant.name}" بنجاح. يمكنك الآن البدء في إنشاء قائمة الطعام وإدارة طلباتك. استمتع بتجربة مجانية لمدة 365 يوم!`,
          "WELCOME"
        );
        console.log("✅ Welcome notification sent");

        // Send notification about free trial activation
        await createNotification(
          result.restaurant.id,
          "تم تفعيل الخطة المجانية! ✨",
          `تم تفعيل الخطة التجريبية المجانية لمطعمك لمدة 365 يوم. يمكنك إنشاء حتى 5 طاولات، قائمة واحدة، فئة واحدة، و 5 عناصر. استمتع بالخدمة! يمكنك رؤية الفاتورة في صفحة الفواتير.`,
          "SUBSCRIPTION"
        );
        console.log("✅ Free trial notification sent");

        // Send notification to all admins about new restaurant registration
        await createNotificationByRole(
          "ADMIN",
          "مطعم جديد تم تسجيله",
          `تم تسجيل مطعم جديد: ${result.restaurant.name} من قبل ${result.user.firstName} ${result.user.lastName}`,
          "RESTAURANT_REGISTRATION",
          null
        );
        console.log("✅ Admin notifications sent to all admins");

        // Create activity for admin dashboard
        await createActivity(
          "restaurant_registered",
          `تم تسجيل مطعم جديد: ${result.restaurant.name} من قبل ${result.user.firstName} ${result.user.lastName}`,
          {
            restaurantName: result.restaurant.name,
            ownerName: `${result.user.firstName} ${result.user.lastName}`,
            ownerEmail: result.user.email,
            restaurantId: result.restaurant.id,
          }
        );
      } catch (error) {
        console.error("❌ Error sending notifications:", error);
      }
    } else {
      console.log("⚠️ No restaurant found in result");
    }

    // Set httpOnly cookie with proper cross-origin support
    const isProd = process.env.NODE_ENV === "production";

    // Get origin from request to log it
    const origin = req.headers.origin || req.headers.referer || "unknown";
    console.log("🌐 Register request origin:", origin);

    // For cross-origin cookies (Frontend on Vercel, Backend on api.qmenussy.com)
    // We need: secure: true, sameSite: "none", and NO domain set
    const cookieOptions: any = {
      httpOnly: true,
      secure: isProd, // MUST be true in production for sameSite: "none"
      sameSite: isProd ? "none" : "lax", // "none" allows cross-origin cookies
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
      // IMPORTANT: Don't set domain - cookie will be scoped to api.qmenussy.com
      // Browser will send it automatically with requests to api.qmenussy.com
      // Frontend on www.qmenussy.com must use withCredentials: true to send it
    };

    // In development, explicitly set domain to undefined for localhost
    if (!isProd) {
      cookieOptions.domain = undefined;
    }

    // Set the cookie
    res.cookie("auth-token", token, cookieOptions);

    // Get the Set-Cookie header to verify it was set correctly
    const setCookieHeader = res.getHeader("Set-Cookie");

    console.log("🍪 Register cookie set:", {
      httpOnly: true,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: "30 days",
      path: cookieOptions.path,
      domain:
        cookieOptions.domain || "not set (will default to api.qmenussy.com)",
      isProduction: isProd,
      origin,
      setCookieHeader: Array.isArray(setCookieHeader)
        ? setCookieHeader[0]
        : setCookieHeader,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
          restaurant: result.restaurant,
        },
        requiresEmailVerification: false,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

router.post("/register", validateRequest(registerSchema), registerUser);

// Login user
export const loginUser = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { email: rawEmail, password } = req.body;

    // Normalize email: convert to lowercase and trim whitespace
    const email = rawEmail ? rawEmail.trim().toLowerCase() : "";

    // Find user with restaurant data
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        restaurants: {
          include: {
            subscriptions: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check if email is verified (skip in production if SKIP_EMAIL_VERIFICATION is true)
    if (!user.emailVerified && process.env.SKIP_EMAIL_VERIFICATION !== "true") {
      return res.status(403).json({
        success: false,
        message:
          "Email not verified. Please check your email for verification code.",
        code: "EMAIL_NOT_VERIFIED",
        requiresEmailVerification: true,
        email: user.email,
      });
    }

    // Generate JWT token
    const token = (jwt.sign as any)(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "30d" } // Extended to 30 days
    );

    // Set httpOnly cookie with proper cross-origin support
    const isProd = process.env.NODE_ENV === "production";

    // Get origin from request to log it
    const origin = req.headers.origin || req.headers.referer || "unknown";
    console.log("🌐 Login request origin:", origin);

    // For cross-origin cookies (Frontend on Vercel, Backend on api.qmenussy.com)
    // We need: secure: true, sameSite: "none", and NO domain set
    const cookieOptions: any = {
      httpOnly: true,
      secure: isProd, // MUST be true in production for sameSite: "none"
      sameSite: isProd ? "none" : "lax", // "none" allows cross-origin cookies
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
      // IMPORTANT: Don't set domain - cookie will be scoped to api.qmenussy.com
      // Browser will send it automatically with requests to api.qmenussy.com
      // Frontend on www.qmenussy.com must use withCredentials: true to send it
    };

    // In development, explicitly set domain to undefined for localhost
    if (!isProd) {
      cookieOptions.domain = undefined;
    }

    // Set the cookie
    res.cookie("auth-token", token, cookieOptions);

    // Get the Set-Cookie header to verify it was set correctly
    const setCookieHeader = res.getHeader("Set-Cookie");

    console.log("🍪 Login cookie set:", {
      httpOnly: true,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: "30 days",
      path: cookieOptions.path,
      domain:
        cookieOptions.domain || "not set (will default to api.qmenussy.com)",
      isProduction: isProd,
      origin,
      setCookieHeader: Array.isArray(setCookieHeader)
        ? setCookieHeader[0]
        : setCookieHeader,
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          restaurant: user.restaurants?.[0],
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "SERVER_ERROR",
    });
  }
};

router.post("/login", loginRateLimiter, validateRequest(loginSchema), loginUser);

// Get current user profile
export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        restaurants: {
          include: {
            subscriptions: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
          restaurant: user.restaurants?.[0],
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

router.get("/me", authenticate, getProfile);

// Update user profile
export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.user!.id;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

router.put("/profile", authenticate, updateProfile);

// Change password
export const changePassword = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user profile
router.get(
  "/profile",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update user profile
router.put(
  "/profile",
  authenticate,
  validateRequest(updateProfileSchema),
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { firstName, lastName, email: rawEmail } = req.body;
      // Normalize email: convert to lowercase and trim whitespace
      const email = rawEmail ? rawEmail.trim().toLowerCase() : "";

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: req.user!.id },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          firstName,
          lastName,
          email,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      });

      res.json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Change password
router.put(
  "/password",
  authenticate,
  validateRequest(changePasswordSchema),
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { password: hashedNewPassword },
      });

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

router.put("/change-password", authenticate, changePassword);

// Logout user
export const logoutUser = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    // Clear httpOnly cookie with same settings used when setting it
    const isProd = process.env.NODE_ENV === "production";
    const clearCookieOptions: any = {
      httpOnly: true,
      secure: isProd, // Must match the cookie setting options
      sameSite: isProd ? "none" : "lax", // Must match the cookie setting options
      path: "/",
    };

    if (!isProd) {
      clearCookieOptions.domain = undefined;
    }

    res.clearCookie("auth-token", clearCookieOptions);

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

router.post("/logout", logoutUser);

// Verify email with code
export const verifyEmail = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { email: rawEmail, verificationCode } = req.body;
    // Normalize email: convert to lowercase and trim whitespace
    const email = rawEmail ? rawEmail.trim().toLowerCase() : "";

    // Find pending email verification record
    const pending = await prisma.emailVerification.findUnique({
      where: { email },
    });
    if (!pending) {
      return res
        .status(404)
        .json({ success: false, message: "Verification request not found" });
    }

    if (pending.verified) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already verified" });
    }

    // Validate verification code by comparing hashed codes
    const hashedInput = hashCode(verificationCode);
    const isValidCode = pending.code && pending.code === hashedInput;

    if (!isValidCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
        code: "INVALID_VERIFICATION_CODE",
      });
    }

    // Check if code is expired
    if (!pending.expiresAt || pending.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired",
        code: "VERIFICATION_CODE_EXPIRED",
      });
    }

    // Mark email as verified (no user yet)
    await prisma.emailVerification.update({
      where: { email },
      data: { verified: true, verifiedAt: new Date() },
    });

    res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Send verification code for registration (checks if user doesn't exist)
export const sendVerificationCodeForRegistration = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { email: rawEmail } = req.body;
    // Normalize email: convert to lowercase and trim whitespace
    const email = rawEmail ? rawEmail.trim().toLowerCase() : "";

    // Check if user already exists - IMPORTANT: Don't send code if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email. Please login instead.",
        code: "USER_ALREADY_EXISTS",
      });
    }

    const now = new Date();
    const existing = await prisma.emailVerification.findUnique({
      where: { email },
    });

    // Rate limiting: Allow 5 attempts, then 15 minutes cooldown, then progressive delays
    let cooldownMinutes = 0;
    let attemptCount = 0;
    let lastAttemptAt: Date | null = null;

    if (existing) {
      attemptCount = existing.attemptCount || 0;
      lastAttemptAt = existing.lastAttemptAt || existing.updatedAt;

      // Reset attempt count if last attempt was more than 24 hours ago
      if (
        lastAttemptAt &&
        now.getTime() - lastAttemptAt.getTime() > 24 * 60 * 60 * 1000
      ) {
        attemptCount = 0;
      }

      // Calculate cooldown based on attempt count
      // Start rate limiting after 2 attempts (from 3rd attempt onwards)
      if (attemptCount < 2) {
        // First 2 attempts: No cooldown (allow immediately)
        cooldownMinutes = 0;
      } else if (attemptCount < 5) {
        // 3rd, 4th, 5th attempts: 1 minute cooldown
        cooldownMinutes = 1;
      } else if (attemptCount === 5) {
        // After 5 attempts: 15 minutes (quarter hour)
        cooldownMinutes = 15;
      } else {
        // Progressive delay: 15 + (attemptCount - 5) * 5 minutes
        // 6th attempt: 20 minutes, 7th: 25 minutes, etc.
        cooldownMinutes = 15 + (attemptCount - 5) * 5;
        // Cap at 60 minutes maximum
        if (cooldownMinutes > 60) {
          cooldownMinutes = 60;
        }
      }

      // Check if cooldown period has passed (only if cooldown > 0)
      if (cooldownMinutes > 0 && lastAttemptAt) {
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const timeSinceLastAttempt = now.getTime() - lastAttemptAt.getTime();

        if (timeSinceLastAttempt < cooldownMs) {
          const remainingMinutes = Math.ceil(
            (cooldownMs - timeSinceLastAttempt) / (60 * 1000)
          );
          return res.status(429).json({
            success: false,
            message: `Please wait ${remainingMinutes} minute${
              remainingMinutes > 1 ? "s" : ""
            } before requesting a new code`,
            code: "RATE_LIMIT_EXCEEDED",
            remainingMinutes,
            attemptCount: attemptCount + 1, // Next attempt number
          });
        }
      }
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const hashed = hashCode(verificationCode);

    // Send verification email first (before updating attempt count)
    const emailSent = await sendVerificationEmail(
      email,
      "User", // Default name since we don't have firstName at this stage
      verificationCode
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later.",
        code: "VERIFICATION_EMAIL_FAILED",
      });
    }

    // Only update attempt count if email was sent successfully
    // Upsert into EmailVerification table (store hashed code and update attempt count)
    await prisma.emailVerification.upsert({
      where: { email },
      create: {
        email,
        code: hashed,
        expiresAt: verificationCodeExpires,
        attemptCount: 1,
        lastAttemptAt: now,
      },
      update: {
        code: hashed,
        expiresAt: verificationCodeExpires,
        verified: false,
        verifiedAt: null,
        attemptCount: attemptCount + 1,
        lastAttemptAt: now,
      },
    });

    res.json({
      success: true,
      message: "Verification code sent successfully. Please check your email.",
    });
  } catch (error) {
    console.error("Send verification code for registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "SERVER_ERROR",
    });
  }
};

// Resend verification code (doesn't check if user exists - for resending to existing verification)
export const resendVerificationCode = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { email: rawEmail, firstName } = req.body;
    // Normalize email: convert to lowercase and trim whitespace
    const email = rawEmail ? rawEmail.trim().toLowerCase() : "";

    const now = new Date();
    const existing = await prisma.emailVerification.findUnique({
      where: { email },
    });

    // Rate limiting: Allow 5 attempts, then 15 minutes cooldown, then progressive delays
    let cooldownMinutes = 0;
    let attemptCount = 0;
    let lastAttemptAt: Date | null = null;

    if (existing) {
      attemptCount = existing.attemptCount || 0;
      lastAttemptAt = existing.lastAttemptAt || existing.updatedAt;

      // Reset attempt count if last attempt was more than 24 hours ago
      if (
        lastAttemptAt &&
        now.getTime() - lastAttemptAt.getTime() > 24 * 60 * 60 * 1000
      ) {
        attemptCount = 0;
      }

      // Calculate cooldown based on attempt count
      // Start rate limiting after 2 attempts (from 3rd attempt onwards)
      if (attemptCount < 2) {
        // First 2 attempts: No cooldown (allow immediately)
        cooldownMinutes = 0;
      } else if (attemptCount < 5) {
        // 3rd, 4th, 5th attempts: 1 minute cooldown
        cooldownMinutes = 1;
      } else if (attemptCount === 5) {
        // After 5 attempts: 15 minutes (quarter hour)
        cooldownMinutes = 15;
      } else {
        // Progressive delay: 15 + (attemptCount - 5) * 5 minutes
        // 6th attempt: 20 minutes, 7th: 25 minutes, etc.
        cooldownMinutes = 15 + (attemptCount - 5) * 5;
        // Cap at 60 minutes maximum
        if (cooldownMinutes > 60) {
          cooldownMinutes = 60;
        }
      }

      // Check if cooldown period has passed (only if cooldown > 0)
      if (cooldownMinutes > 0 && lastAttemptAt) {
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const timeSinceLastAttempt = now.getTime() - lastAttemptAt.getTime();

        if (timeSinceLastAttempt < cooldownMs) {
          const remainingMinutes = Math.ceil(
            (cooldownMs - timeSinceLastAttempt) / (60 * 1000)
          );
          return res.status(429).json({
            success: false,
            message: `Please wait ${remainingMinutes} minute${
              remainingMinutes > 1 ? "s" : ""
            } before requesting a new code`,
            code: "RATE_LIMIT_EXCEEDED",
            remainingMinutes,
            attemptCount: attemptCount + 1, // Next attempt number
          });
        }
      }
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const hashed = hashCode(verificationCode);

    // Send verification email first (before updating attempt count)
    const emailSent = await sendVerificationEmail(
      email,
      firstName || "User",
      verificationCode
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later.",
        code: "VERIFICATION_EMAIL_FAILED",
      });
    }

    // Only update attempt count if email was sent successfully
    // Upsert into EmailVerification table (store hashed code and update attempt count)
    await prisma.emailVerification.upsert({
      where: { email },
      create: {
        email,
        code: hashed,
        expiresAt: verificationCodeExpires,
        attemptCount: 1,
        lastAttemptAt: now,
      },
      update: {
        code: hashed,
        expiresAt: verificationCodeExpires,
        verified: false,
        verifiedAt: null,
        attemptCount: attemptCount + 1,
        lastAttemptAt: now,
      },
    });

    res.json({
      success: true,
      message: "Verification code sent successfully. Please check your email.",
    });
  } catch (error) {
    console.error("Resend verification code error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "SERVER_ERROR",
    });
  }
};

// Forgot password
export const forgotPassword = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { email: rawEmail } = req.body;
    // Normalize email: convert to lowercase and trim whitespace
    const email = rawEmail ? rawEmail.trim().toLowerCase() : "";

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    const now = new Date();
    // Check for existing password reset attempts
    const existingReset = await prisma.passwordReset.findFirst({
      where: { email, used: false },
      orderBy: { createdAt: "desc" },
    });

    // Rate limiting: Allow 3 attempts, then 5 minutes cooldown, then progressive delays
    let cooldownMinutes = 0;
    let attemptCount = 0;
    let lastAttemptAt: Date | null = null;

    if (existingReset) {
      attemptCount = existingReset.attemptCount || 0;
      lastAttemptAt = existingReset.lastAttemptAt || existingReset.createdAt;

      // Reset attempt count if last attempt was more than 24 hours ago
      if (
        lastAttemptAt &&
        now.getTime() - lastAttemptAt.getTime() > 24 * 60 * 60 * 1000
      ) {
        attemptCount = 0;
      }

      // Calculate cooldown based on attempt count
      // Start rate limiting after 2 attempts (from 3rd attempt onwards)
      if (attemptCount < 2) {
        // First 2 attempts: No cooldown (allow immediately)
        cooldownMinutes = 0;
      } else if (attemptCount === 2) {
        // 3rd attempt: 1 minute cooldown
        cooldownMinutes = 1;
      } else if (attemptCount === 3) {
        // After 3 attempts: 5 minutes
        cooldownMinutes = 5;
      } else {
        // Progressive delay: 5 + (attemptCount - 3) * 3 minutes
        // 4th attempt: 8 minutes, 5th: 11 minutes, etc.
        cooldownMinutes = 5 + (attemptCount - 3) * 3;
        // Cap at 30 minutes maximum
        if (cooldownMinutes > 30) {
          cooldownMinutes = 30;
        }
      }

      // Check if cooldown period has passed (only if cooldown > 0)
      if (cooldownMinutes > 0 && lastAttemptAt) {
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const timeSinceLastAttempt = now.getTime() - lastAttemptAt.getTime();

        if (timeSinceLastAttempt < cooldownMs) {
          const remainingMinutes = Math.ceil(
            (cooldownMs - timeSinceLastAttempt) / (60 * 1000)
          );
          return res.status(429).json({
            success: false,
            message: `Please wait ${remainingMinutes} minute${
              remainingMinutes > 1 ? "s" : ""
            } before requesting a new code`,
            code: "RATE_LIMIT_EXCEEDED",
            remainingMinutes,
            attemptCount: attemptCount + 1,
          });
        }
      }
    }

    // Generate reset code (10 minutes) and store hashed
    const resetCode = generateResetCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const resetHashed = hashCode(resetCode);

    // Delete any existing unused reset codes for this email
    await prisma.passwordReset.deleteMany({
      where: { email, used: false },
    });

    // Send password reset email first (before updating attempt count)
    const emailSent = await sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetCode
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send password reset email",
        code: "PASSWORD_RESET_EMAIL_FAILED",
      });
    }

    // Only update attempt count if email was sent successfully
    // Create new password reset record with attempt tracking
    await prisma.passwordReset.create({
      data: {
        email,
        resetCode: resetHashed,
        expiresAt,
        attemptCount: attemptCount + 1,
        lastAttemptAt: now,
      },
    });

    res.json({
      success: true,
      message: "Password reset code sent successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Reset password
export const resetPassword = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { email: rawEmail, resetCode, newPassword } = req.body;
    // Normalize email: convert to lowercase and trim whitespace
    const email = rawEmail ? rawEmail.trim().toLowerCase() : "";

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find valid reset code
    const passwordReset = await prisma.passwordReset.findFirst({
      where: {
        email,
        resetCode: hashCode(resetCode),
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!passwordReset) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code",
        code: "INVALID_RESET_CODE",
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and mark reset code as used
    await prisma.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
        },
      });

      await tx.passwordReset.update({
        where: { id: passwordReset.id },
        data: {
          used: true,
        },
      });
    });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Routes
router.post("/verify-email", validateRequest(verifyEmailSchema), verifyEmail);
// Send verification code for registration (checks if user doesn't exist)
router.post(
  "/send-verification",
  validateRequest(resendVerificationSchema),
  sendVerificationCodeForRegistration
);
// Resend verification code (doesn't check if user exists - for resending)
router.post(
  "/resend-verification",
  validateRequest(resendVerificationSchema),
  resendVerificationCode
);
router.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  forgotPassword
);
router.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  resetPassword
);

// Test SMTP configuration endpoint (for debugging)
export const testSMTP = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required for testing",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    console.log(`🧪 Testing SMTP configuration for: ${email}`);

    const result = await testEmailSending(email);

    if (result) {
      return res.json({
        success: true,
        message:
          "Test email sent successfully. Please check your inbox (and spam folder).",
      });
    } else {
      return res.status(500).json({
        success: false,
        message:
          "Failed to send test email. Check server logs for detailed error information.",
      });
    }
  } catch (error: any) {
    console.error("Test SMTP error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Test SMTP endpoint (no validation needed - just for testing)
router.post("/test-smtp", testSMTP);

export default router;
