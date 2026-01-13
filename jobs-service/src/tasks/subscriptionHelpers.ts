// Import subscription helpers from api-service
// This file re-exports the functions needed for jobs-service

// Import Prisma client
import prisma from "../../../shared/config/db";

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
        // Send notification to restaurant owner
        await createNotification(
          subscription.restaurantId,
          "تذكير: اشتراكك سينتهي غداً",
          `اشتراكك في الخطة ${subscription.plan.name} سينتهي غداً. يرجى تجديد اشتراكك للحفاظ على الخدمة دون انقطاع.`,
          "GENERAL"
        );

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

      // Send notification to restaurant owner
      await createNotification(
        subscription.restaurantId,
        "انتهى اشتراكك",
        `انتهى اشتراكك في الخطة ${subscription.plan.name}. يرجى تجديد اشتراكك لاستمرار استخدام الخدمة.`,
        "GENERAL"
      );

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
