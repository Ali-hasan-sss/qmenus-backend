const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    console.log("🔍 Checking notifications...");

    // Get all notifications
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        restaurant: {
          select: {
            name: true,
            owner: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log(`📊 Found ${notifications.length} notifications:`);

    notifications.forEach((notification, index) => {
      console.log(`\n${index + 1}. ${notification.title}`);
      console.log(`   Restaurant: ${notification.restaurant?.name || "N/A"}`);
      console.log(
        `   Owner: ${notification.restaurant?.owner?.firstName || "N/A"} ${
          notification.restaurant?.owner?.lastName || "N/A"
        }`
      );
      console.log(`   Type: ${notification.type}`);
      console.log(`   Created: ${notification.createdAt}`);
      console.log(`   Body: ${notification.body.substring(0, 100)}...`);
    });

    // Check recent restaurants
    console.log("\n🏪 Recent restaurants:");
    const recentRestaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        owner: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        subscriptions: {
          include: {
            plan: true,
          },
        },
      },
    });

    recentRestaurants.forEach((restaurant, index) => {
      console.log(`\n${index + 1}. ${restaurant.name}`);
      console.log(
        `   Owner: ${restaurant.owner.firstName} ${restaurant.owner.lastName} (${restaurant.owner.email})`
      );
      console.log(`   Created: ${restaurant.createdAt}`);
      console.log(`   Subscriptions: ${restaurant.subscriptions.length}`);
      restaurant.subscriptions.forEach((sub) => {
        console.log(`     - ${sub.plan.name} (${sub.status})`);
      });
    });
  } catch (error) {
    console.error("❌ Error checking notifications:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();
