import prisma from "../../../shared/config/db";

// Helper function to create activities
export async function createActivity(
  type: string,
  message: string,
  metadata?: any
) {
  try {
    const activity = await prisma.activity.create({
      data: {
        type,
        message,
        metadata: metadata || {},
      },
    });
    return activity;
  } catch (error) {
    console.error("Error creating activity:", error);
    return null;
  }
}

// Helper function to create notifications
export async function createNotification(
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

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// Helper function to create notifications by role
export async function createNotificationByRole(
  role: "ADMIN" | "OWNER",
  title: string,
  body: string,
  type: string = "GENERAL",
  restaurantId: string | null = null
) {
  try {
    // Get all users with the specified role
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true },
    });

    if (users.length === 0) {
      console.log(`No ${role} users found`);
      return [];
    }

    // Create notifications for all users with this role
    const notifications = await Promise.all(
      users.map((user: { id: string }) =>
        prisma.notification.create({
          data: {
            userId: user.id,
            restaurantId: role === "ADMIN" ? null : restaurantId,
            title,
            body,
            type: type as any,
          },
        })
      )
    );

    console.log(`✅ ${role} notifications sent to ${users.length} users`);
    return notifications;
  } catch (error) {
    console.error(`Error creating ${role} notifications:`, error);
    return [];
  }
}

// Helper function to create admin notifications (for backward compatibility)
export async function createAdminNotification(
  title: string,
  body: string,
  type: string = "GENERAL",
  restaurantId: string = ""
) {
  return createNotificationByRole("ADMIN", title, body, type, null);
}

// Function to check expiring subscriptions (1 day before expiry)
// NOTE: This function is kept for manual/admin use. Automatic checks are handled by jobs-service
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
        },
      },
      include: {
        restaurant: true,
        plan: true,
      },
    });

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
// NOTE: This function is kept for manual/admin use. Automatic checks are handled by jobs-service
export async function checkExpiredSubscriptions() {
  try {
    console.log("⏰ Checking expired subscriptions...");

    const now = new Date();

    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: {
          lt: now,
        },
        plan: {
          isFree: false, // Exclude free plans from expiration check
        },
      },
      include: {
        restaurant: true,
        plan: true,
      },
    });

    let updatedCount = 0;

    for (const subscription of expiredSubscriptions) {
      // Update subscription status to EXPIRED
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "EXPIRED" },
      });

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
// NOTE: This function is kept for manual/admin use. Automatic checks are handled by jobs-service
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
