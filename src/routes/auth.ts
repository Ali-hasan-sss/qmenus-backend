import express, { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
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
} from "../helpers/emailHelpers";

const router = express.Router();

// Register new user
export const registerUser = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const {
      email,
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create user and restaurant in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role || "OWNER",
          verificationCode,
          verificationCodeExpires,
          emailVerified: false,
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
        const { io } = require("../index");
        await createNotification(
          result.restaurant.id,
          "مرحباً بك في QMenus! 🎉",
          `مرحباً ${result.user.firstName}! تم إنشاء حساب مطعمك "${result.restaurant.name}" بنجاح. يمكنك الآن البدء في إنشاء قائمة الطعام وإدارة طلباتك. استمتع بتجربة مجانية لمدة 365 يوم!`,
          "WELCOME",
          io
        );
        console.log("✅ Welcome notification sent");

        // Send notification about free trial activation
        await createNotification(
          result.restaurant.id,
          "تم تفعيل الخطة المجانية! ✨",
          `تم تفعيل الخطة التجريبية المجانية لمطعمك لمدة 365 يوم. يمكنك إنشاء حتى 5 طاولات، قائمة واحدة، فئة واحدة، و 5 عناصر. استمتع بالخدمة! يمكنك رؤية الفاتورة في صفحة الفواتير.`,
          "SUBSCRIPTION",
          io
        );
        console.log("✅ Free trial notification sent");

        // Send notification to all admins about new restaurant registration
        await createNotificationByRole(
          "ADMIN",
          "مطعم جديد تم تسجيله",
          `تم تسجيل مطعم جديد: ${result.restaurant.name} من قبل ${result.user.firstName} ${result.user.lastName}`,
          "RESTAURANT_REGISTRATION",
          null,
          io
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

    // Send verification email
    let emailSent = false;
    try {
      emailSent = await sendVerificationEmail(
        result.user.email,
        result.user.firstName,
        verificationCode
      );

      if (emailSent) {
        console.log("✅ Verification email sent successfully");
      } else {
        console.log("⚠️ Failed to send verification email");
      }
    } catch (error) {
      console.error("❌ Error sending verification email:", error);
      // Don't fail registration if email fails
    }

    // Set httpOnly cookie
    res.cookie("auth-token", token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: "lax", // Allow cross-origin cookies for development
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
    });

    res.status(201).json({
      success: true,
      message: emailSent
        ? "User registered successfully. Please check your email for verification code."
        : "User registered successfully. Email verification may be delayed.",
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
          restaurant: result.restaurant,
        },
        requiresEmailVerification: true,
        emailSent: emailSent,
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
    const { email, password } = req.body;

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
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Email not verified. Please check your email for verification code.",
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

    // Set httpOnly cookie
    res.cookie("auth-token", token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: "lax", // Allow cross-origin cookies for development
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
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
    });
  }
};

router.post("/login", validateRequest(loginSchema), loginUser);

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
      const { firstName, lastName, email } = req.body;

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
    // Clear httpOnly cookie
    res.clearCookie("auth-token", {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: "lax", // Allow cross-origin cookies for development
      path: "/",
    });

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
    const { email, verificationCode } = req.body;

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

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Check verification code
    if (!user.verificationCode || user.verificationCode !== verificationCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // Check if code is expired
    if (
      !user.verificationCodeExpires ||
      user.verificationCodeExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired",
      });
    }

    // Update user to verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpires: null,
      },
    });

    res.json({
      success: true,
      message: "Email verified successfully",
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          emailVerified: updatedUser.emailVerified,
        },
      },
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Resend verification code
export const resendVerificationCode = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { email } = req.body;

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

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with new verification code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationCodeExpires,
      },
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(
      user.email,
      user.firstName,
      verificationCode
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email",
      });
    }

    res.json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("Resend verification code error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Forgot password
export const forgotPassword = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { email } = req.body;

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

    // Generate reset code
    const resetCode = generateResetCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset codes for this email
    await prisma.passwordReset.deleteMany({
      where: { email },
    });

    // Create new password reset record
    await prisma.passwordReset.create({
      data: {
        email,
        resetCode,
        expiresAt,
      },
    });

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetCode
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send password reset email",
      });
    }

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
    const { email, resetCode, newPassword } = req.body;

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
        resetCode,
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
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and mark reset code as used
    await prisma.$transaction(async (tx) => {
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

export default router;
