const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Restaurant ID
const RESTAURANT_ID = "cmg3rc496000312hmdgh2mvoa";

async function addSimpleSubscription() {
  try {
    console.log("🚀 Adding simple subscription for restaurant...");

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
      console.log(`   - Start Date: ${existingSubscription.startDate}`);
      console.log(`   - End Date: ${existingSubscription.endDate}`);
      return;
    }

    // Get or create admin user
    let adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!adminUser) {
      console.log("👤 Creating admin user...");
      adminUser = await prisma.user.create({
        data: {
          email: "admin@mymenus.com",
          password: "admin123",
          role: "ADMIN",
          firstName: "System",
          lastName: "Admin",
        },
      });
    }

    // Get or create a simple plan
    let plan = await prisma.plan.findFirst({
      where: { name: "Free Plan" },
    });

    if (!plan) {
      console.log("📋 Creating Free Plan...");
      plan = await prisma.plan.create({
        data: {
          name: "Free Plan",
          nameAr: "الخطة المجانية",
          description: "Free plan for testing and development",
          descriptionAr: "خطة مجانية للاختبار والتطوير",
          type: "BASIC",
          price: 0.0,
          currency: "USD",
          duration: 365, // 1 year free
          maxTables: 5,
          maxMenus: 3,
          features: [
            "Basic menus",
            "QR code generation",
            "Order management",
            "Basic support",
          ],
          isActive: true,
          creatorId: adminUser.id,
        },
      });
      console.log("✅ Created plan:", plan.name);
    } else {
      console.log("✅ Found existing plan:", plan.name);
    }

    // Create subscription
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

    console.log("\n🎉 Subscription created successfully!");
    console.log("📊 Subscription details:");
    console.log(`   - ID: ${subscription.id}`);
    console.log(`   - Status: ${subscription.status}`);
    console.log(`   - Plan: ${plan.name}`);
    console.log(`   - Start Date: ${subscription.startDate.toDateString()}`);
    console.log(`   - End Date: ${subscription.endDate.toDateString()}`);
    console.log(`   - Duration: ${plan.duration} days`);
    console.log(`   - Price: $${plan.price} ${plan.currency}`);

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

    console.log(
      "\n🌟 Now you can access the customer menu without 403 errors!"
    );
  } catch (error) {
    console.error("❌ Error creating subscription:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addSimpleSubscription();
