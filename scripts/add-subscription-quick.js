const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Restaurant ID
const RESTAURANT_ID = "cmg3rc496000312hmdgh2mvoa";

async function addSubscriptionQuick() {
  try {
    console.log("🚀 Adding subscription quickly...");

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: RESTAURANT_ID },
    });

    if (!restaurant) {
      console.error("❌ Restaurant not found with ID:", RESTAURANT_ID);
      return;
    }

    console.log("✅ Restaurant found:", restaurant.name);

    // Check if restaurant already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        restaurantId: RESTAURANT_ID,
        status: "ACTIVE",
      },
    });

    if (existingSubscription) {
      console.log("⚠️ Restaurant already has an active subscription");
      console.log("📅 Subscription details:");
      console.log(`   - ID: ${existingSubscription.id}`);
      console.log(`   - Status: ${existingSubscription.status}`);
      return;
    }

    // Find any existing user (preferably admin, but any user will do)
    let user = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!user) {
      user = await prisma.user.findFirst(); // Get any user
    }

    if (!user) {
      console.error(
        "❌ No users found in database. Please create a user first."
      );
      return;
    }

    console.log("✅ Using user:", user.email);

    // Find or create a simple plan
    let plan = await prisma.plan.findFirst({
      where: { name: "Free Plan" },
    });

    if (!plan) {
      console.log("📋 Creating Free Plan...");
      plan = await prisma.plan.create({
        data: {
          name: "Free Plan",
          nameAr: "الخطة المجانية",
          description: "Free plan for testing",
          descriptionAr: "خطة مجانية للاختبار",
          type: "BASIC",
          price: 0.0,
          currency: "USD",
          duration: 365,
          maxTables: 10,
          maxMenus: 5,
          features: ["Basic features"],
          isActive: true,
          creatorId: user.id,
        },
      });
      console.log("✅ Created plan:", plan.name);
    } else {
      console.log("✅ Found existing plan:", plan.name);
    }

    // Create subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(startDate.getFullYear() + 1);

    const subscription = await prisma.subscription.create({
      data: {
        status: "ACTIVE",
        startDate: startDate,
        endDate: endDate,
        restaurantId: RESTAURANT_ID,
        planId: plan.id,
      },
    });

    console.log("\n🎉 Subscription created successfully!");
    console.log("📊 Subscription details:");
    console.log(`   - ID: ${subscription.id}`);
    console.log(`   - Status: ${subscription.status}`);
    console.log(`   - Plan: ${plan.name}`);
    console.log(`   - Start Date: ${subscription.startDate.toDateString()}`);
    console.log(`   - End Date: ${subscription.endDate.toDateString()}`);
    console.log(`   - Price: $${plan.price} ${plan.currency}`);

    console.log(
      "\n🌟 Now you can access the customer menu without 403 errors!"
    );
  } catch (error) {
    console.error("❌ Error creating subscription:", error);
    console.error("Details:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addSubscriptionQuick();
