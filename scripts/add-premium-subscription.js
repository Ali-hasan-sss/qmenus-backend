const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Restaurant ID
const RESTAURANT_ID = "cmg5787xi003jwtf7do0c35od";

async function addPremiumSubscription() {
  try {
    console.log("🚀 Adding premium subscription for restaurant...");

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
      console.log("🔄 Updating existing subscription to premium...");

      // Update existing subscription to premium
      const updatedSubscription = await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "ACTIVE",
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
      });

      console.log("✅ Updated existing subscription to premium");
      console.log(
        "📅 New end date:",
        updatedSubscription.endDate.toDateString()
      );
      return;
    }

    // Get or create a premium plan
    let plan = await prisma.plan.findFirst({
      where: { name: "Premium Plan" },
    });

    if (!plan) {
      console.log("📋 Creating Premium Plan...");
      // Get or create admin user for plan creator
      let adminUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });

      if (!adminUser) {
        console.log("👤 Creating admin user for plan creator...");
        adminUser = await prisma.user.create({
          data: {
            email: "admin@mymenus.com",
            password: "admin123", // In production, this should be hashed
            role: "ADMIN",
            firstName: "System",
            lastName: "Admin",
          },
        });
      }

      plan = await prisma.plan.create({
        data: {
          name: "Premium Plan",
          nameAr: "الخطة المميزة",
          description: "Premium restaurant plan with all features",
          descriptionAr: "خطة المطعم المميزة مع جميع الميزات",
          type: "PREMIUM",
          price: 99.99,
          currency: "USD",
          duration: 365, // 1 year
          maxTables: 50,
          maxMenus: 20,
          features: [
            "Unlimited menus",
            "QR code generation",
            "Advanced order management",
            "Real-time analytics",
            "Custom themes",
            "Priority support",
            "Multiple locations",
            "API access",
            "Custom branding",
            "Advanced reporting",
          ],
          isActive: true,
          creatorId: adminUser.id,
        },
      });
      console.log("✅ Created plan:", plan.name);
    } else {
      console.log("✅ Found existing plan:", plan.name);
    }

    // Create premium subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(startDate.getFullYear() + 1); // 1 year from now

    const subscription = await prisma.subscription.create({
      data: {
        status: "ACTIVE",
        startDate: startDate,
        endDate: endDate,
        restaurantId: RESTAURANT_ID,
        planId: plan.id,
      },
    });

    console.log("\n🎉 Premium subscription created successfully!");
    console.log("📊 Subscription details:");
    console.log(`   - ID: ${subscription.id}`);
    console.log(`   - Status: ${subscription.status}`);
    console.log(`   - Plan: ${plan.name}`);
    console.log(`   - Start Date: ${subscription.startDate.toDateString()}`);
    console.log(`   - End Date: ${subscription.endDate.toDateString()}`);
    console.log(`   - Duration: ${plan.duration} days`);
    console.log(`   - Price: $${plan.price} ${plan.currency}`);

    console.log("\n🌟 Premium features included:");
    plan.features.forEach((feature, index) => {
      console.log(`   ${index + 1}. ${feature}`);
    });

    // Verify the subscription was created
    const verifySubscription = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: {
        plan: true,
        restaurant: true,
      },
    });

    console.log("\n✅ Verification:");
    console.log(`   - Restaurant: ${verifySubscription.restaurant.name}`);
    console.log(`   - Plan: ${verifySubscription.plan.name}`);
    console.log(`   - Status: ${verifySubscription.status}`);
  } catch (error) {
    console.error("❌ Error creating premium subscription:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addPremiumSubscription();
