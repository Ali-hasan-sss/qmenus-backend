// Import subscription helpers from api-service
// This file re-exports the functions needed for jobs-service

// Import Prisma client
import prisma from "../../../shared/config/db";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
const envPaths = [
  path.join(__dirname, "../../../.env"), // backend/.env
  path.join(__dirname, "../../../../.env"), // backend/.env (alternative)
  path.join(process.cwd(), ".env"), // Current working directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  dotenv.config();
}

// SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST || "mail.qmenussy.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_SECURE = process.env.SMTP_SECURE !== "false";
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_FROM || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "Q-menus";
const EMAIL_LOGO_URL =
  process.env.EMAIL_LOGO_URL || "https://www.qmenussy.com/images/logo.png";

// Create nodemailer transporter
const transporterConfig: any = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  connectionTimeout: 30000,
  socketTimeout: 30000,
  greetingTimeout: 30000,
  pool: false,
  requireTLS: false,
};

if (process.env.SMTP_IGNORE_TLS !== "true") {
  transporterConfig.tls = {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2",
    servername: SMTP_HOST,
    sessionReuse: false,
  };

  if (SMTP_SECURE) {
    transporterConfig.requireTLS = false;
  } else {
    transporterConfig.requireTLS =
      process.env.SMTP_REQUIRE_TLS === "true";
  }
} else {
  transporterConfig.ignoreTLS = true;
  transporterConfig.requireTLS = false;
}

const transporter = nodemailer.createTransport(transporterConfig);

// Helper function to send email
async function sendSubscriptionEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!EMAIL_FROM || !SMTP_USER || !SMTP_PASS) {
    console.error(
      "❌ Email configuration not complete. Cannot send subscription email."
    );
    return false;
  }

  try {
    const mailOptions = {
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to,
      subject,
      html: html.replace(/cid:qmenus-logo/g, EMAIL_LOGO_URL), // Replace CID with URL for jobs-service
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Subscription email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error sending subscription email to ${to}:`, error.message);
    return false;
  }
}

// Helper function to create notifications
async function createNotification(
  restaurantId: string,
  title: string,
  body: string,
  type: string = "GENERAL"
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        restaurantId,
        title,
        body,
        type: type as any,
      },
    });

    // Send real-time notification via socket-service
    try {
      const axios = require("axios");
      const env = require("../../../shared/config/env").env;
      const socketServiceUrl =
        env.SOCKET_SERVICE_URL ||
        `http://localhost:${env.SOCKET_PORT || "5001"}`;

      await axios.post(`${socketServiceUrl}/api/emit-notification`, {
        notification,
        restaurantIds: [restaurantId],
      });

      console.log(
        `✅ Sent real-time notification to restaurant ${restaurantId} via socket`
      );
    } catch (socketError: any) {
      console.error(
        "⚠️ Socket notification error:",
        socketError?.message || socketError
      );
      // Continue anyway - notification is saved in DB
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// Helper function to create admin notifications
async function createAdminNotification(
  title: string,
  body: string,
  type: string = "GENERAL",
  restaurantId: string = ""
) {
  try {
    // Get all admin users
    const users = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (users.length === 0) {
      return [];
    }

    // Create notifications for all admin users
    const notifications = await Promise.all(
      users.map((user: { id: string }) =>
        prisma.notification.create({
          data: {
            userId: user.id,
            restaurantId: null,
            title,
            body,
            type: type as any,
          },
          include: {
            restaurant: restaurantId
              ? {
                  select: {
                    id: true,
                    name: true,
                  },
                }
              : false,
          },
        })
      )
    );

    console.log(`✅ Admin notifications sent to ${users.length} users`);

    // Send real-time notifications via socket-service
    if (notifications.length > 0) {
      try {
        const axios = require("axios");
        const env = require("../../../shared/config/env").env;
        const socketServiceUrl =
          env.SOCKET_SERVICE_URL ||
          `http://localhost:${env.SOCKET_PORT || "5001"}`;

        // Send each notification to its admin user via socket
        for (const notification of notifications) {
          await axios.post(`${socketServiceUrl}/api/emit-admin-notification`, {
            notification,
            adminIds: [notification.userId],
          });
        }

        console.log(
          `✅ Sent ${notifications.length} real-time admin notifications via socket`
        );
      } catch (socketError: any) {
        console.error(
          "⚠️ Socket admin notification error:",
          socketError?.message || socketError
        );
        // Continue anyway - notifications are saved in DB
      }
    }

    return notifications;
  } catch (error) {
    console.error("Error creating admin notifications:", error);
    return [];
  }
}

// Function to check expiring subscriptions (1 day before expiry)
export async function checkExpiringSubscriptions() {
  try {
    console.log("📅 Checking expiring subscriptions...");

    // One-day reminder window
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: {
          lte: oneDayFromNow,
          gte: new Date(), // Not expired yet
          not: null, // Ensure endDate is not null
        },
      },
      include: {
        restaurant: true,
        plan: true,
      },
    });

    console.log(
      `📊 Found ${expiringSubscriptions.length} expiring subscriptions (within 24 hours)`
    );

    let notificationsSent = 0;

    for (const subscription of expiringSubscriptions) {
      const msLeft =
        new Date(subscription.endDate!).getTime() - new Date().getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      // Check if we already sent a notification for this subscription today
      const existingNotification = await prisma.notification.findFirst({
        where: {
          restaurantId: subscription.restaurantId,
          title: "تذكير: اشتراكك سينتهي غداً",
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
          },
        },
      });

      if (!existingNotification && daysLeft <= 1) {
        // Get restaurant owner email
        const restaurantWithOwner = await prisma.restaurant.findUnique({
          where: { id: subscription.restaurantId },
          include: {
            owner: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        // Send notification to restaurant owner
        await createNotification(
          subscription.restaurantId,
          "تذكير: اشتراكك سينتهي غداً",
          `اشتراكك في الخطة ${subscription.plan.name} سينتهي غداً. يرجى تجديد اشتراكك للحفاظ على الخدمة دون انقطاع.`,
          "GENERAL"
        );

        // Send email to restaurant owner if email exists
        if (restaurantWithOwner?.owner?.email) {
          const ownerName =
            restaurantWithOwner.owner.firstName ||
            restaurantWithOwner.owner.lastName
              ? `${restaurantWithOwner.owner.firstName || ""} ${restaurantWithOwner.owner.lastName || ""}`.trim()
              : "عزيزي/عزيزتي";

          const emailHtml = `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="${EMAIL_LOGO_URL}" alt="Q-menus Logo" title="Q-menus" style="max-width: 120px; height: auto; display: block; margin: 0 auto;">
                </div>
                <h2 style="color: #f97316; text-align: center; margin-bottom: 30px;">مرحباً ${ownerName}!</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
                  تلقينا تنبيهاً بأن اشتراكك في الخطة <strong>${subscription.plan.name}</strong> سينتهي <strong>غداً</strong>.
                </p>
                <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
                  يرجى تجديد اشتراكك في أقرب وقت ممكن للحفاظ على الخدمة دون انقطاع والاستمرار في استخدام جميع ميزات منصة قوائمي.
                </p>
                <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
                  <h3 style="margin: 0 0 10px 0; font-size: 20px;">تاريخ انتهاء الاشتراك</h3>
                  <p style="margin: 0; font-size: 24px; font-weight: bold;">
                    ${new Date(subscription.endDate!).toLocaleDateString("ar-SA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
                  إذا كان لديك أي استفسارات أو تحتاج إلى مساعدة في تجديد اشتراكك، يرجى التواصل معنا.
                </p>
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="font-size: 12px; color: #999;">
                    © 2024 QMenus. جميع الحقوق محفوظة.
                  </p>
                </div>
              </div>
            </div>
          `;

          await sendSubscriptionEmail(
            restaurantWithOwner.owner.email,
            "تذكير: اشتراكك سينتهي غداً - QMenus",
            emailHtml
          );
        }

        // Send notification to admin
        await createAdminNotification(
          "اشتراك ينتهي غداً",
          `اشتراك المطعم ${subscription.restaurant.name} في الخطة ${subscription.plan.name} ينتهي غداً`,
          "SUBSCRIPTION_EXPIRING",
          subscription.restaurantId
        );

        notificationsSent++;
      }
    }

    console.log(
      `✅ Expiring subscriptions check completed: ${notificationsSent} notifications sent`
    );
    return { notificationsSent, expiringCount: expiringSubscriptions.length };
  } catch (error) {
    console.error("❌ Error checking expiring subscriptions:", error);
    return { notificationsSent: 0, expiringCount: 0 };
  }
}

// Function to check and mark expired subscriptions
export async function checkExpiredSubscriptions() {
  try {
    console.log("⏰ Checking expired subscriptions...");

    const now = new Date();

    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: {
          lt: now,
          not: null, // Ensure endDate is not null
        },
        // Include all plans (free and paid) - check all subscriptions with endDate
      },
      include: {
        restaurant: true,
        plan: true,
      },
    });

    console.log(
      `📊 Found ${expiredSubscriptions.length} expired subscriptions to process`
    );

    let updatedCount = 0;

    for (const subscription of expiredSubscriptions) {
      console.log(
        `🔄 Processing expired subscription: ${subscription.id} for restaurant ${subscription.restaurant.name} (${subscription.restaurantId})`
      );

      // Check if restaurant has any other active subscriptions (that are not expired)
      const hasOtherActiveSubscription = await prisma.subscription.findFirst({
        where: {
          restaurantId: subscription.restaurantId,
          status: "ACTIVE",
          id: { not: subscription.id },
          OR: [
            { endDate: { gte: now } }, // Has future endDate
            { endDate: null }, // No endDate (permanent subscription)
          ],
        },
      });

      console.log(
        `   Restaurant has other active subscriptions: ${
          hasOtherActiveSubscription ? "Yes" : "No"
        }`
      );

      // Update subscription status to EXPIRED
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "EXPIRED" },
      });
      console.log(`   ✅ Subscription ${subscription.id} marked as EXPIRED`);

      // Deactivate restaurant if no other active subscriptions exist
      if (!hasOtherActiveSubscription) {
        await prisma.restaurant.update({
          where: { id: subscription.restaurantId },
          data: { isActive: false },
        });
        console.log(
          `🔒 Restaurant ${subscription.restaurant.name} (${subscription.restaurantId}) deactivated due to expired subscription`
        );
      } else {
        console.log(
          `   ℹ️ Restaurant ${subscription.restaurant.name} remains active (has other active subscriptions)`
        );
      }

      // Get restaurant owner email
      const restaurantWithOwner = await prisma.restaurant.findUnique({
        where: { id: subscription.restaurantId },
        include: {
          owner: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Send notification to restaurant owner
      await createNotification(
        subscription.restaurantId,
        "انتهى اشتراكك",
        `انتهى اشتراكك في الخطة ${subscription.plan.name}. يرجى تجديد اشتراكك لاستمرار استخدام الخدمة.`,
        "GENERAL"
      );

      // Send email to restaurant owner if email exists
      if (restaurantWithOwner?.owner?.email) {
        const ownerName =
          restaurantWithOwner.owner.firstName ||
          restaurantWithOwner.owner.lastName
            ? `${restaurantWithOwner.owner.firstName || ""} ${restaurantWithOwner.owner.lastName || ""}`.trim()
            : "عزيزي/عزيزتي";

        const emailHtml = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${EMAIL_LOGO_URL}" alt="Q-menus Logo" title="Q-menus" style="max-width: 120px; height: auto; display: block; margin: 0 auto;">
              </div>
              <h2 style="color: #dc2626; text-align: center; margin-bottom: 30px;">مرحباً ${ownerName}!</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
                نود إعلامك بأن اشتراكك في الخطة <strong>${subscription.plan.name}</strong> قد <strong style="color: #dc2626;">انتهى</strong>.
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
                للاستمرار في استخدام جميع ميزات منصة قوائمي، يرجى تجديد اشتراكك في أقرب وقت ممكن.
              </p>
              <div style="background-color: #fee2e2; border: 2px solid #dc2626; color: #991b1b; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
                <h3 style="margin: 0 0 10px 0; font-size: 20px; color: #991b1b;">تاريخ انتهاء الاشتراك</h3>
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #dc2626;">
                  ${new Date(subscription.endDate!).toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              ${!hasOtherActiveSubscription ? `<p style="font-size: 16px; line-height: 1.6; color: #dc2626; margin-bottom: 20px; font-weight: bold;">
                ⚠️ تم تعطيل حسابك مؤقتاً بسبب انتهاء الاشتراك. يرجى التجديد لتفعيل الحساب.
              </p>` : ""}
              <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
                إذا كان لديك أي استفسارات أو تحتاج إلى مساعدة في تجديد اشتراكك، يرجى التواصل معنا.
              </p>
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #999;">
                  © 2024 QMenus. جميع الحقوق محفوظة.
                </p>
              </div>
            </div>
          </div>
        `;

        await sendSubscriptionEmail(
          restaurantWithOwner.owner.email,
          "انتهى اشتراكك - QMenus",
          emailHtml
        );
      }

      // Send notification to admin
      await createAdminNotification(
        "اشتراك انتهى",
        `انتهى اشتراك المطعم ${subscription.restaurant.name} في الخطة ${subscription.plan.name}`,
        "SUBSCRIPTION_EXPIRED",
        subscription.restaurantId
      );

      updatedCount++;
    }

    console.log(
      `✅ Expired subscriptions check completed: ${updatedCount} subscriptions expired`
    );
    return { updatedCount, expiredCount: expiredSubscriptions.length };
  } catch (error) {
    console.error("❌ Error checking expired subscriptions:", error);
    return { updatedCount: 0, expiredCount: 0 };
  }
}

// Function to run daily subscription checks
export async function runDailySubscriptionChecks() {
  console.log("🔍 Running daily subscription checks...");
  const expiringResult = await checkExpiringSubscriptions();
  const expiredResult = await checkExpiredSubscriptions();
  console.log("✅ Daily subscription checks completed");

  return {
    expiring: expiringResult,
    expired: expiredResult,
  };
}
