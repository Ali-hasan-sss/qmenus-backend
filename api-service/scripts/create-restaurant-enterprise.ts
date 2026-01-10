import bcrypt from "bcryptjs";
import path from "path";
import dotenv from "dotenv";
import { existsSync } from "node:fs";

// Load environment variables - try multiple locations
const envPaths = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(process.cwd(), ".env"),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`📄 Loaded .env from: ${envPath}`);
    break;
  }
}

// Import Prisma Client from shared location
// Structure: backend/api-service/scripts/ -> backend/shared/node_modules/@prisma/client
// From scripts: ../../shared/node_modules/@prisma/client
const possiblePaths = [
  path.resolve(__dirname, "../../shared/node_modules/@prisma/client"), // From scripts folder
  path.resolve(process.cwd(), "../shared/node_modules/@prisma/client"), // From api-service folder
  path.resolve(__dirname, "../../../shared/node_modules/@prisma/client"), // Alternative
];

let PrismaClient: any;
let prismaPath: string | null = null;

for (const testPath of possiblePaths) {
  if (existsSync(testPath)) {
    prismaPath = testPath;
    console.log(`✅ Found Prisma Client at: ${testPath}`);
    break;
  }
}

if (!prismaPath) {
  console.error("❌ Prisma Client not found. Searched paths:");
  possiblePaths.forEach((p, i) => {
    const exists = existsSync(p);
    console.error(`  ${i + 1}. ${p} ${exists ? "✅" : "❌"}`);
  });
  console.error("\n__dirname:", __dirname);
  console.error("process.cwd():", process.cwd());
  console.error("\nPlease ensure Prisma Client is generated:");
  console.error("  cd ../shared && npm run prisma:generate");
  process.exit(1);
}

try {
  PrismaClient = require(prismaPath).PrismaClient;
  console.log("✅ Successfully loaded Prisma Client");
} catch (error: any) {
  console.error("❌ Failed to load Prisma Client:", error.message);
  process.exit(1);
}

const prisma = new PrismaClient();

// Kitchen Sections
const kitchenSections = [
  { name: "المشاوي", nameAr: "المشاوي", sortOrder: 1 },
  { name: "المقبلات", nameAr: "المقبلات", sortOrder: 2 },
  { name: "المقالي", nameAr: "المقالي", sortOrder: 3 },
  { name: "الغربية", nameAr: "الغربية", sortOrder: 4 },
];

// Categories with items (7 categories, each with 5-10 items)
const categoriesData = [
  {
    name: "Grilled Meats",
    nameAr: "المشويات",
    description: "Delicious grilled meats",
    descriptionAr: "مشويات لذيذة",
    items: [
      {
        name: "Grilled Chicken",
        nameAr: "دجاج مشوي",
        description: "Tender grilled chicken breast",
        descriptionAr: "صدر دجاج مشوي طري",
        price: 25000,
        kitchenSection: "المشاوي",
      },
      {
        name: "Grilled Kebab",
        nameAr: "كباب مشوي",
        description: "Traditional grilled kebab",
        descriptionAr: "كباب مشوي تقليدي",
        price: 30000,
        kitchenSection: "المشاوي",
      },
      {
        name: "Grilled Shish Tawook",
        nameAr: "شيش طاووق",
        description: "Marinated chicken skewers",
        descriptionAr: "أسياخ دجاج متبلة",
        price: 28000,
        kitchenSection: "المشاوي",
      },
      {
        name: "Grilled Lamb Chops",
        nameAr: "كستلاتة مشوية",
        description: "Tender lamb chops",
        descriptionAr: "كستلاتة لحم طري",
        price: 45000,
        kitchenSection: "المشاوي",
      },
      {
        name: "Grilled Fish",
        nameAr: "سمك مشوي",
        description: "Fresh grilled fish",
        descriptionAr: "سمك طازج مشوي",
        price: 35000,
        kitchenSection: "المشاوي",
      },
      {
        name: "Grilled Kofta",
        nameAr: "كفتة مشوية",
        description: "Spiced ground meat",
        descriptionAr: "لحم مفروم متبل",
        price: 26000,
        kitchenSection: "المشاوي",
      },
    ],
  },
  {
    name: "Appetizers",
    nameAr: "المقبلات",
    description: "Fresh appetizers",
    descriptionAr: "مقبلات طازجة",
    items: [
      {
        name: "Hummus",
        nameAr: "حمص",
        description: "Creamy chickpea dip",
        descriptionAr: "حمص كريمي",
        price: 12000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Moutabal",
        nameAr: "متبل",
        description: "Smoky eggplant dip",
        descriptionAr: "متبل الباذنجان",
        price: 13000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Fattoush Salad",
        nameAr: "فتوش",
        description: "Fresh mixed salad",
        descriptionAr: "سلطة فتوش طازجة",
        price: 15000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Tabbouleh",
        nameAr: "تبولة",
        description: "Parsley salad with bulgur",
        descriptionAr: "سلطة بقدونس مع برغل",
        price: 14000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Stuffed Grape Leaves",
        nameAr: "ورق عنب",
        description: "Rice-stuffed grape leaves",
        descriptionAr: "ورق عنب محشي بالرز",
        price: 18000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Cheese Rolls",
        nameAr: "لفائف الجبن",
        description: "Crispy cheese rolls",
        descriptionAr: "لفائف جبن مقرمشة",
        price: 16000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Mixed Appetizers",
        nameAr: "مقبلات مشكلة",
        description: "Assorted appetizers plate",
        descriptionAr: "طبق مقبلات متنوعة",
        price: 35000,
        kitchenSection: "المقبلات",
      },
    ],
  },
  {
    name: "Fried Items",
    nameAr: "المقالي",
    description: "Crispy fried dishes",
    descriptionAr: "أطباق مقلية مقرمشة",
    items: [
      {
        name: "Fried Chicken",
        nameAr: "دجاج مقلي",
        description: "Crispy fried chicken",
        descriptionAr: "دجاج مقلي مقرمش",
        price: 22000,
        kitchenSection: "المقالي",
      },
      {
        name: "French Fries",
        nameAr: "بطاطا مقلية",
        description: "Golden crispy fries",
        descriptionAr: "بطاطا مقلية ذهبية",
        price: 10000,
        kitchenSection: "المقالي",
      },
      {
        name: "Fried Falafel",
        nameAr: "فلافل",
        description: "Crispy chickpea fritters",
        descriptionAr: "فلافل مقرمشة",
        price: 12000,
        kitchenSection: "المقالي",
      },
      {
        name: "Fried Shrimp",
        nameAr: "روبيان مقلي",
        description: "Crispy fried shrimp",
        descriptionAr: "روبيان مقلي مقرمش",
        price: 40000,
        kitchenSection: "المقالي",
      },
      {
        name: "Fried Halloumi",
        nameAr: "حلوم مقلي",
        description: "Grilled halloumi cheese",
        descriptionAr: "جبنة حلوم مقلية",
        price: 20000,
        kitchenSection: "المقالي",
      },
      {
        name: "Fried Kibbeh",
        nameAr: "كبة مقلية",
        description: "Crispy stuffed kibbeh",
        descriptionAr: "كبة محشية مقلية",
        price: 18000,
        kitchenSection: "المقالي",
      },
      {
        name: "Fried Spring Rolls",
        nameAr: "سبرينغ رول",
        description: "Crispy spring rolls",
        descriptionAr: "سبرينغ رول مقرمش",
        price: 15000,
        kitchenSection: "المقالي",
      },
      {
        name: "Fried Calamari",
        nameAr: "حبار مقلي",
        description: "Crispy fried calamari",
        descriptionAr: "حبار مقلي مقرمش",
        price: 38000,
        kitchenSection: "المقالي",
      },
    ],
  },
  {
    name: "Western Dishes",
    nameAr: "الأطباق الغربية",
    description: "International cuisine",
    descriptionAr: "أطباق عالمية",
    items: [
      {
        name: "Beef Burger",
        nameAr: "برجر لحم",
        description: "Juicy beef burger",
        descriptionAr: "برجر لحم طري",
        price: 25000,
        kitchenSection: "الغربية",
      },
      {
        name: "Chicken Burger",
        nameAr: "برجر دجاج",
        description: "Tender chicken burger",
        descriptionAr: "برجر دجاج طري",
        price: 22000,
        kitchenSection: "الغربية",
      },
      {
        name: "Pizza Margherita",
        nameAr: "بيتزا مارغريتا",
        description: "Classic Italian pizza",
        descriptionAr: "بيتزا إيطالية كلاسيكية",
        price: 30000,
        kitchenSection: "الغربية",
      },
      {
        name: "Pasta Carbonara",
        nameAr: "باستا كاربونارا",
        description: "Creamy pasta with bacon",
        descriptionAr: "باستا كريمية مع بيكون",
        price: 28000,
        kitchenSection: "الغربية",
      },
      {
        name: "Grilled Steak",
        nameAr: "ستيك مشوي",
        description: "Premium grilled steak",
        descriptionAr: "ستيك مشوي ممتاز",
        price: 50000,
        kitchenSection: "الغربية",
      },
      {
        name: "Caesar Salad",
        nameAr: "سلطة سيزر",
        description: "Fresh caesar salad",
        descriptionAr: "سلطة سيزر طازجة",
        price: 20000,
        kitchenSection: "الغربية",
      },
    ],
  },
  {
    name: "Desserts",
    nameAr: "الحلويات",
    description: "Sweet treats",
    descriptionAr: "حلويات لذيذة",
    items: [
      {
        name: "Baklava",
        nameAr: "بقلاوة",
        description: "Sweet pastry with nuts",
        descriptionAr: "حلويات بنكهة الجوز",
        price: 18000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Kunafa",
        nameAr: "كنافة",
        description: "Sweet cheese pastry",
        descriptionAr: "كنافة بالجبن",
        price: 20000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Ice Cream",
        nameAr: "آيس كريم",
        description: "Vanilla ice cream",
        descriptionAr: "آيس كريم فانيليا",
        price: 12000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Fresh Fruit",
        nameAr: "فواكه طازجة",
        description: "Seasonal fresh fruits",
        descriptionAr: "فواكه موسمية طازجة",
        price: 15000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Cheesecake",
        nameAr: "تشيز كيك",
        description: "Creamy cheesecake",
        descriptionAr: "تشيز كيك كريمي",
        price: 22000,
        kitchenSection: "المقبلات",
      },
    ],
  },
  {
    name: "Drinks",
    nameAr: "المشروبات",
    description: "Refreshing beverages",
    descriptionAr: "مشروبات منعشة",
    items: [
      {
        name: "Fresh Orange Juice",
        nameAr: "عصير برتقال طازج",
        description: "Freshly squeezed orange juice",
        descriptionAr: "عصير برتقال معصور طازج",
        price: 10000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Lemon Mint",
        nameAr: "ليمون بالنعناع",
        description: "Refreshing lemon mint drink",
        descriptionAr: "مشروب ليمون بالنعناع منعش",
        price: 8000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Soft Drinks",
        nameAr: "مشروبات غازية",
        description: "Assorted soft drinks",
        descriptionAr: "مشروبات غازية متنوعة",
        price: 6000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Turkish Coffee",
        nameAr: "قهوة تركية",
        description: "Traditional Turkish coffee",
        descriptionAr: "قهوة تركية تقليدية",
        price: 7000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Fresh Mint Tea",
        nameAr: "شاي بالنعناع",
        description: "Hot mint tea",
        descriptionAr: "شاي ساخن بالنعناع",
        price: 5000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Iced Tea",
        nameAr: "شاي مثلج",
        description: "Refreshing iced tea",
        descriptionAr: "شاي مثلج منعش",
        price: 7000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Fresh Watermelon Juice",
        nameAr: "عصير بطيخ",
        description: "Fresh watermelon juice",
        descriptionAr: "عصير بطيخ طازج",
        price: 9000,
        kitchenSection: "المقبلات",
      },
      {
        name: "Fresh Apple Juice",
        nameAr: "عصير تفاح",
        description: "Freshly squeezed apple juice",
        descriptionAr: "عصير تفاح طازج",
        price: 10000,
        kitchenSection: "المقبلات",
      },
    ],
  },
  {
    name: "Rice Dishes",
    nameAr: "أطباق الأرز",
    description: "Delicious rice dishes",
    descriptionAr: "أطباق أرز لذيذة",
    items: [
      {
        name: "Mansaf",
        nameAr: "منسف",
        description: "Traditional lamb with rice",
        descriptionAr: "لحم مع أرز تقليدي",
        price: 40000,
        kitchenSection: "المشاوي",
      },
      {
        name: "Maqluba",
        nameAr: "مقلوبة",
        description: "Upside-down rice dish",
        descriptionAr: "طبق أرز مقلوب",
        price: 35000,
        kitchenSection: "المقالي",
      },
      {
        name: "Kabsa",
        nameAr: "كبسة",
        description: "Spiced rice with chicken",
        descriptionAr: "أرز متبل مع دجاج",
        price: 30000,
        kitchenSection: "المشاوي",
      },
      {
        name: "Biryani",
        nameAr: "برياني",
        description: "Fragrant spiced rice",
        descriptionAr: "أرز معطر متبل",
        price: 32000,
        kitchenSection: "المشاوي",
      },
      {
        name: "Rice with Chicken",
        nameAr: "أرز مع دجاج",
        description: "Steamed rice with chicken",
        descriptionAr: "أرز بخاري مع دجاج",
        price: 25000,
        kitchenSection: "المشاوي",
      },
      {
        name: "Vegetable Rice",
        nameAr: "أرز بالخضار",
        description: "Rice with mixed vegetables",
        descriptionAr: "أرز مع خضار متنوعة",
        price: 20000,
        kitchenSection: "المقالي",
      },
      {
        name: "Rice with Meat",
        nameAr: "أرز مع لحم",
        description: "Rice with tender meat",
        descriptionAr: "أرز مع لحم طري",
        price: 38000,
        kitchenSection: "المشاوي",
      },
    ],
  },
];

async function main() {
  console.log("🌱 Starting restaurant creation script...");

  try {
    // Step 1: Get or create admin user (needed for plan creator)
    let admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!admin) {
      const adminPassword = await bcrypt.hash("admin123", 12);
      admin = await prisma.user.create({
        data: {
          email: "admin@gmail.com",
          password: adminPassword,
          firstName: "Admin",
          lastName: "User",
          role: "ADMIN",
          emailVerified: true,
        },
      });
      console.log("✅ Admin user created");
    }

    // Step 2: Get or create Enterprise plan
    let enterprisePlan = await prisma.plan.findFirst({
      where: { type: "ENTERPRISE" },
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
          maxTables: 999999,
          maxMenus: 1,
          maxCategories: 999999,
          maxItems: 999999,
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
      console.log("✅ Enterprise plan created");
    } else {
      console.log("✅ Enterprise plan already exists");
    }

    // Step 3: Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: "res@qmenussy.com" },
      include: {
        restaurants: true,
      },
    });

    if (existingUser) {
      console.log("⚠️ User with email res@qmenussy.com already exists");
      console.log("Deleting existing user and restaurant...");

      // Delete in transaction to ensure data integrity
      await prisma.$transaction(async (tx: any) => {
        // Delete all restaurants owned by this user (cascade will handle related data)
        for (const restaurant of existingUser.restaurants) {
          // Delete QR codes
          await tx.qRCode.deleteMany({
            where: { restaurantId: restaurant.id },
          });

          // Delete subscriptions
          await tx.subscription.deleteMany({
            where: { restaurantId: restaurant.id },
          });

          // Delete restaurants will cascade delete categories, items, etc.
          await tx.restaurant.delete({
            where: { id: restaurant.id },
          });
        }

        // Delete user notifications
        await tx.notification.deleteMany({
          where: { userId: existingUser.id },
        });

        // Delete user
        await tx.user.delete({
          where: { id: existingUser.id },
        });
      });

      console.log("✅ Existing user and restaurant deleted");
    }

    // Step 4: Create user
    const hashedPassword = await bcrypt.hash("00000000", 12);
    const user = await prisma.user.create({
      data: {
        email: "res@qmenussy.com",
        password: hashedPassword,
        firstName: "Restaurant",
        lastName: "Owner",
        role: "OWNER",
        emailVerified: true,
      },
    });
    console.log("✅ User created:", user.email);

    // Step 5: Create restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        name: "Sample Restaurant",
        nameAr: "مطعم تجريبي",
        description: "A sample restaurant with full menu",
        descriptionAr: "مطعم تجريبي بقائمة كاملة",
        email: "res@qmenussy.com",
        ownerId: user.id,
      },
    });
    console.log("✅ Restaurant created:", restaurant.name);

    // Step 6: Create Enterprise subscription
    const subscription = await prisma.subscription.create({
      data: {
        restaurantId: restaurant.id,
        planId: enterprisePlan.id,
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });
    console.log("✅ Enterprise subscription created");

    // Step 7: Create kitchen sections
    const createdKitchenSections: { [key: string]: string } = {};
    for (const section of kitchenSections) {
      const createdSection = await prisma.kitchenSection.create({
        data: {
          name: section.name,
          nameAr: section.nameAr,
          sortOrder: section.sortOrder,
          restaurantId: restaurant.id,
        },
      });
      createdKitchenSections[section.nameAr] = createdSection.id;
      console.log(`✅ Kitchen section created: ${section.nameAr}`);
    }

    // Step 8: Create menu
    const menu = await prisma.menu.create({
      data: {
        name: "Main Menu",
        nameAr: "القائمة الرئيسية",
        restaurantId: restaurant.id,
        isActive: true,
      },
    });
    console.log("✅ Menu created");

    // Step 9: Create categories and items
    for (let i = 0; i < categoriesData.length; i++) {
      const categoryData = categoriesData[i];
      const category = await prisma.category.create({
        data: {
          name: categoryData.name,
          nameAr: categoryData.nameAr,
          description: categoryData.description,
          descriptionAr: categoryData.descriptionAr,
          menuId: menu.id,
          restaurantId: restaurant.id,
          sortOrder: i + 1,
          order: i + 1,
          isActive: true,
        },
      });
      console.log(`✅ Category created: ${categoryData.name}`);

      // Create items for this category
      for (let j = 0; j < categoryData.items.length; j++) {
        const itemData = categoryData.items[j];
        const kitchenSectionId =
          createdKitchenSections[itemData.kitchenSection];

        await prisma.menuItem.create({
          data: {
            name: itemData.name,
            nameAr: itemData.nameAr,
            description: itemData.description,
            descriptionAr: itemData.descriptionAr,
            price: itemData.price,
            categoryId: category.id,
            restaurantId: restaurant.id,
            sortOrder: j + 1,
            order: j + 1,
            isAvailable: true,
            kitchenSectionId: kitchenSectionId || null,
          },
        });
      }
      console.log(
        `✅ Created ${categoryData.items.length} items for category: ${categoryData.name}`
      );
    }

    // Step 10: Create 30 tables (QR Codes)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    for (let i = 1; i <= 30; i++) {
      const tableNumber = i.toString();
      const qrCodeUrl = `${frontendUrl}/menu/${restaurant.id}?tableNumber=${tableNumber}`;

      await prisma.qRCode.create({
        data: {
          tableNumber,
          qrCode: qrCodeUrl,
          restaurantId: restaurant.id,
          isActive: true,
        },
      });
    }
    console.log("✅ Created 30 tables (QR Codes)");

    // Summary
    console.log("\n✅ Restaurant setup completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email: res@qmenussy.com");
    console.log("🔐 Password: 00000000");
    console.log("🏪 Restaurant ID:", restaurant.id);
    console.log("📋 Categories:", categoriesData.length);
    console.log(
      "🍽️ Total Items:",
      categoriesData.reduce((sum, cat) => sum + cat.items.length, 0)
    );
    console.log("🔪 Kitchen Sections:", kitchenSections.length);
    console.log("🪑 Tables:", 30);
    console.log("💎 Plan: Enterprise");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("❌ Error creating restaurant:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
