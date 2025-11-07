import prisma from "../../shared/config/db";

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
  type: string = "GENERAL",
  io?: any
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

    // Socket.io will be handled by socket-service
    // if (io) {
    //   io.to(`restaurant_${restaurantId}`).emit(
    //     "new_notification",
    //     notification
    //   );

    //   // Also broadcast unread count update
    //   try {
    //     const unreadCount = await prisma.notification.count({
    //       where: {
    //         restaurantId: restaurantId,
    //         isRead: false,
    //       },
    //     });
    //     io.to(`restaurant_${restaurantId}`).emit("restaurant_unread_count", {
    //       unreadCount,
    //     });
    //   } catch (error) {
    //     console.error("Error broadcasting unread count:", error);
    //   }
    // }

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
  restaurantId: string | null = null,
  io?: any
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
      users.map((user) =>
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

    // Socket.io will be handled by socket-service
    // if (io) {
    //   users.forEach((user, index) => {
    //     const room =
    //       role === "ADMIN" ? `admin_${user.id}` : `restaurant_${restaurantId}`;
    //     const eventName =
    //       role === "ADMIN" ? "new_admin_notification" : "new_notification";
    //     io.to(room).emit(eventName, {
    //       id: notifications[index].id,
    //       title,
    //       body,
    //       type,
    //       isRead: false,
    //       createdAt: new Date(),
    //     });
    //   });

    //   // Broadcast unread count updates
    //   if (role === "ADMIN") {
    //     // Update unread count for all admin users
    //     users.forEach(async (user) => {
    //       try {
    //         const unreadCount = await prisma.notification.count({
    //           where: {
    //             userId: user.id,
    //             isRead: false,
    //           },
    //         });
    //         io.to(`admin_${user.id}`).emit("admin_unread_count", {
    //           unreadCount,
    //         });
    //       } catch (error) {
    //         console.error("Error broadcasting admin unread count:", error);
    //       }
    //     });
    //   } else if (restaurantId) {
    //     // Update unread count for restaurant
    //     try {
    //       const unreadCount = await prisma.notification.count({
    //         where: {
    //           restaurantId: restaurantId,
    //           isRead: false,
    //         },
    //       });
    //       io.to(`restaurant_${restaurantId}`).emit("restaurant_unread_count", {
    //         unreadCount,
    //       });
    //     } catch (error) {
    //       console.error("Error broadcasting restaurant unread count:", error);
    //     }
    //   }
    // }

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
  restaurantId: string = "",
  io?: any
) {
  return createNotificationByRole("ADMIN", title, body, type, null, io);
}

// Function to check expiring subscriptions (3 days before expiry)
export async function checkExpiringSubscriptions(io?: any) {
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
          "GENERAL",
          io
        );

        // Send notification to admin
        await createAdminNotification(
          "اشتراك ينتهي غداً",
          `اشتراك المطعم ${subscription.restaurant.name} في الخطة ${subscription.plan.name} ينتهي غداً`,
          "SUBSCRIPTION_EXPIRING",
          subscription.restaurantId,
          io
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
export async function checkExpiredSubscriptions(io?: any) {
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
        "GENERAL",
        io
      );

      // Send notification to admin
      await createAdminNotification(
        "اشتراك انتهى",
        `انتهى اشتراك المطعم ${subscription.restaurant.name} في الخطة ${subscription.plan.name}`,
        "SUBSCRIPTION_EXPIRED",
        subscription.restaurantId,
        io
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
export async function runDailySubscriptionChecks(io?: any) {
  console.log("🔍 Running daily subscription checks...");
  const expiringResult = await checkExpiringSubscriptions(io);
  const expiredResult = await checkExpiredSubscriptions(io);
  console.log("✅ Daily subscription checks completed");

  return {
    expiring: expiringResult,
    expired: expiredResult,
  };
}
