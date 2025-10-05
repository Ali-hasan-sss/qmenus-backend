const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Creating free trial plan...");

  // Check if free trial plan already exists
  const existingPlan = await prisma.plan.findFirst({
    where: { isFree: true },
  });

  if (existingPlan) {
    console.log("✅ Free trial plan already exists:", existingPlan.name);
    return;
  }

  // Get an admin user as creator
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!admin) {
    console.error("❌ No admin user found. Please create an admin user first.");
    return;
  }

  const freeTrialPlan = await prisma.plan.create({
    data: {
      name: "Free Trial",
      nameAr: "تجربة مجانية",
      description: "Free trial plan with limited features",
      descriptionAr: "خطة تجريبية مجانية بميزات محدودة",
      type: "BASIC",
      price: 0,
      currency: "USD",
      duration: 365, // 1 year
      maxTables: 5,
      maxMenus: 1,
      maxCategories: 1,
      maxItems: 5,
      canCustomizeTheme: false,
      features: ["1 Category", "5 Items", "5 Tables", "Basic Features"],
      isActive: true,
      isFree: true,
      creatorId: admin.id,
    },
  });

  console.log("✅ Free trial plan created successfully!");
  console.log("Plan ID:", freeTrialPlan.id);
  console.log("Plan Name:", freeTrialPlan.name);
  console.log("Features:");
  console.log("  - Max Categories:", freeTrialPlan.maxCategories);
  console.log("  - Max Items per Category:", freeTrialPlan.maxItems);
  console.log("  - Max Tables:", freeTrialPlan.maxTables);
  console.log("  - Can Customize Theme:", freeTrialPlan.canCustomizeTheme);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
