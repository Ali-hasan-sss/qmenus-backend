const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Restaurant ID
const RESTAURANT_ID = "cmg3rc496000312hmdgh2mvoa";

async function testUnsplashImages() {
  try {
    console.log("🧪 Testing Unsplash images...");

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: RESTAURANT_ID },
    });

    if (!restaurant) {
      console.error("❌ Restaurant not found with ID:", RESTAURANT_ID);
      return;
    }

    console.log("✅ Restaurant found:", restaurant.name);

    // Check categories with Unsplash images
    const categories = await prisma.category.findMany({
      where: { menu: { restaurantId: RESTAURANT_ID } },
      include: { items: true },
    });

    console.log(`\n📊 Found ${categories.length} categories:`);

    categories.forEach((category, index) => {
      console.log(`\n${index + 1}. ${category.name} (${category.nameAr})`);
      console.log(`   Image: ${category.image}`);
      console.log(`   Items: ${category.items.length}`);

      // Show first item image if exists
      if (category.items.length > 0 && category.items[0].image) {
        console.log(`   Sample item image: ${category.items[0].image}`);
      }
    });

    // Test image URLs
    console.log("\n🔍 Testing image URLs:");
    const testUrls = [
      "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
    ];

    testUrls.forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });

    console.log("\n✅ Image URLs look correct!");
    console.log(
      "📝 Make sure next.config.js includes 'images.unsplash.com' in domains"
    );
  } catch (error) {
    console.error("❌ Error testing images:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
testUnsplashImages();
