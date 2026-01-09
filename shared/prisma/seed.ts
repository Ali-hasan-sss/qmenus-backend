import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      email: "admin@gmail.com",
      password: adminPassword,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      emailVerified: true, // Admin is pre-verified
      verificationCode: null,
      verificationCodeExpires: null,
    },
  });

  console.log("✅ Admin user created:", admin.email);
  console.log("📧 Email: admin@gmail.com");
  console.log("🔐 Password: admin123");

  // Create free trial plan
  let freeTrialPlan = await prisma.plan.findFirst({
    where: { isFree: true },
  });

  if (!freeTrialPlan) {
    freeTrialPlan = await prisma.plan.create({
      data: {
        name: "Free Trial",
        nameAr: "الخطة المجانية",
        description:
          "Free plan with basic features - 1 category, 5 items, 5 tables",
        descriptionAr:
          "خطة مجانية بميزات أساسية - فئة واحدة، 5 أصناف، 5 طاولات",
        type: "FREE",
        price: 0,
        currency: "SYP",
        duration: 0, // 0 means unlimited
        maxTables: 5,
        maxMenus: 1,
        maxCategories: 1,
        maxItems: 5,
        canCustomizeTheme: false,
        features: ["1 Category", "5 Items", "5 Tables", "No External Orders"],
        isActive: true,
        isFree: true,
        creatorId: admin.id,
      },
    });
    console.log("✅ Free trial plan created:", freeTrialPlan.name);
  } else {
    console.log("✅ Free trial plan already exists:", freeTrialPlan.name);
  }

  console.log(
    "📋 Free plan: 1 category, 5 items, 5 tables, unlimited duration"
  );

  // Create basic plan
  let basicPlan = await prisma.plan.findFirst({
    where: {
      name: "Basic Plan",
      isFree: false,
    },
  });

  if (!basicPlan) {
    basicPlan = await prisma.plan.create({
      data: {
        name: "Basic Plan",
        nameAr: "الخطة الأساسية",
        description:
          "30 tables, 20 categories, 30 items per category - 1 month",
        descriptionAr: "30 طاولة، 20 فئة، 30 صنف لكل فئة - شهر واحد",
        type: "BASIC",
        price: 50,
        currency: "SYP",
        duration: 30,
        maxTables: 30,
        maxMenus: 1,
        maxCategories: 20,
        maxItems: 30,
        canCustomizeTheme: false,
        features: [
          "30 Tables",
          "20 Categories",
          "30 Items per Category",
          "1 Month Duration",
          "External Orders",
        ],
        isActive: true,
        isFree: false,
        creatorId: admin.id,
      },
    });
    console.log("✅ Basic plan created:", basicPlan.name);
  } else {
    console.log("✅ Basic plan already exists:", basicPlan.name);
  }

  // Create premium plan
  let premiumPlan = await prisma.plan.findFirst({
    where: {
      name: "Premium Plan",
      isFree: false,
    },
  });

  if (!premiumPlan) {
    premiumPlan = await prisma.plan.create({
      data: {
        name: "Premium Plan",
        nameAr: "الخطة المميزة",
        description:
          "50 tables, 30 categories, 30 items per category, custom theme - 1 month",
        descriptionAr:
          "50 طاولة، 30 فئة، 30 صنف لكل فئة، تخصيص الثيم - شهر واحد",
        type: "PREMIUM",
        price: 75,
        currency: "SYP",
        duration: 30,
        maxTables: 50,
        maxMenus: 1,
        maxCategories: 30,
        maxItems: 30,
        canCustomizeTheme: true,
        features: [
          "50 Tables",
          "30 Categories",
          "30 Items per Category",
          "Custom Theme",
          "1 Month Duration",
          "External Orders",
        ],
        isActive: true,
        isFree: false,
        creatorId: admin.id,
      },
    });
    console.log("✅ Premium plan created:", premiumPlan.name);
  } else {
    console.log("✅ Premium plan already exists:", premiumPlan.name);
  }

  // Create enterprise plan
  let enterprisePlan = await prisma.plan.findFirst({
    where: {
      name: "Enterprise Plan",
      isFree: false,
    },
  });

  if (!enterprisePlan) {
    enterprisePlan = await prisma.plan.create({
      data: {
        name: "Enterprise Plan",
        nameAr: "الخطة المؤسسية",
        description:
          "Unlimited tables, unlimited categories, unlimited items, custom theme - 1 month",
        descriptionAr:
          "طاولات مفتوحة، فئات مفتوحة، أصناف مفتوحة، تخصيص الثيم - شهر واحد",
        type: "ENTERPRISE",
        price: 100000,
        currency: "SYP",
        duration: 30,
        maxTables: 999999, // Unlimited
        maxMenus: 1,
        maxCategories: 999999, // Unlimited
        maxItems: 999999, // Unlimited
        canCustomizeTheme: true,
        features: [
          "Unlimited Tables",
          "Unlimited Categories",
          "Unlimited Items",
          "Custom Theme",
          "1 Month Duration",
          "External Orders",
          "Priority Support",
        ],
        isActive: true,
        isFree: false,
        creatorId: admin.id,
      },
    });
    console.log("✅ Enterprise plan created:", enterprisePlan.name);
  } else {
    console.log("✅ Enterprise plan already exists:", enterprisePlan.name);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
