const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Restaurant ID
const RESTAURANT_ID = "cmg3rc496000312hmdgh2mvoa";

async function checkSubscription() {
  try {
    console.log("🔍 Checking subscription status...");

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: RESTAURANT_ID },
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!restaurant) {
      console.error("❌ Restaurant not found with ID:", RESTAURANT_ID);
      return;
    }

    console.log("✅ Restaurant found:", restaurant.name);
    console.log(`📊 Total subscriptions: ${restaurant.subscriptions.length}`);

    if (restaurant.subscriptions.length === 0) {
      console.log("❌ No subscriptions found for this restaurant");
      console.log(
        "💡 Run 'add-subscription.js' or 'add-premium-subscription.js' to create one"
      );
      return;
    }

    // Check each subscription
    restaurant.subscriptions.forEach((subscription, index) => {
      console.log(`\n📋 Subscription ${index + 1}:`);
      console.log(`   - ID: ${subscription.id}`);
      console.log(`   - Status: ${subscription.status}`);
      console.log(
        `   - Plan: ${subscription.plan.name} (${subscription.plan.nameAr})`
      );
      console.log(`   - Start Date: ${subscription.startDate.toDateString()}`);
      console.log(
        `   - End Date: ${
          subscription.endDate?.toDateString() || "No end date"
        }`
      );

      // Check if subscription is active
      const now = new Date();
      const isActive =
        subscription.status === "ACTIVE" &&
        (!subscription.endDate || subscription.endDate > now);

      if (isActive) {
        console.log(`   - ✅ Status: ACTIVE`);
        if (subscription.endDate) {
          const daysLeft = Math.ceil(
            (subscription.endDate - now) / (1000 * 60 * 60 * 24)
          );
          console.log(`   - ⏰ Days remaining: ${daysLeft}`);
        }
      } else {
        console.log(`   - ❌ Status: INACTIVE`);
        if (subscription.endDate && subscription.endDate <= now) {
          console.log(
            `   - ⏰ Expired on: ${subscription.endDate.toDateString()}`
          );
        }
      }
    });

    // Check if restaurant has any active subscription
    const activeSubscription = restaurant.subscriptions.find(
      (sub) =>
        sub.status === "ACTIVE" && (!sub.endDate || sub.endDate > new Date())
    );

    if (activeSubscription) {
      console.log("\n🎉 Restaurant has an ACTIVE subscription!");
      console.log(`📋 Plan: ${activeSubscription.plan.name}`);
      console.log(
        `💰 Price: $${activeSubscription.plan.price} ${activeSubscription.plan.currency}`
      );
      console.log(`📅 Duration: ${activeSubscription.plan.duration} days`);

      console.log("\n🌟 Available features:");
      activeSubscription.plan.features.forEach((feature, index) => {
        console.log(`   ${index + 1}. ${feature}`);
      });
    } else {
      console.log("\n❌ Restaurant does NOT have an active subscription");
      console.log("💡 This is why you're getting 403 errors");
      console.log("🔧 Run one of these scripts to fix:");
      console.log("   - node backend/scripts/add-subscription.js (Basic Plan)");
      console.log(
        "   - node backend/scripts/add-premium-subscription.js (Premium Plan)"
      );
    }
  } catch (error) {
    console.error("❌ Error checking subscription:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkSubscription();
