const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Restaurant ID
const RESTAURANT_ID = "cmg3rc496000312hmdgh2mvoa";

// Quick items to add (simple format)
const quickItems = [
  {
    categoryName: "Appetizers",
    items: [
      {
        name: "Garlic Bread",
        nameAr: "خبز الثوم",
        price: "6.99",
        image:
          "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop",
      },
      {
        name: "Onion Rings",
        nameAr: "حلقات البصل",
        price: "7.99",
        image:
          "https://images.unsplash.com/photo-1551782450-17144efb9c50?w=400&h=300&fit=crop",
      },
    ],
  },
  {
    categoryName: "Main Courses",
    items: [
      {
        name: "Chicken Burger",
        nameAr: "برجر الدجاج",
        price: "15.99",
        image:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
      },
      {
        name: "Beef Burger",
        nameAr: "برجر اللحم",
        price: "17.99",
        image:
          "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop",
      },
    ],
  },
  {
    categoryName: "Pizza",
    items: [
      {
        name: "Hawaiian Pizza",
        nameAr: "بيتزا هاواي",
        price: "18.99",
        image:
          "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop",
      },
      {
        name: "Meat Lovers",
        nameAr: "بيتزا عشاق اللحم",
        price: "22.99",
        image:
          "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop",
      },
    ],
  },
  {
    categoryName: "Beverages",
    items: [
      {
        name: "Coca Cola",
        nameAr: "كوكا كولا",
        price: "2.99",
        image:
          "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop",
      },
      {
        name: "Fresh Juice",
        nameAr: "عصير طازج",
        price: "4.99",
        image:
          "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop",
      },
    ],
  },
  {
    categoryName: "Desserts",
    items: [
      {
        name: "Ice Cream",
        nameAr: "آيس كريم",
        price: "5.99",
        image:
          "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop",
      },
      {
        name: "Fruit Salad",
        nameAr: "سلطة فواكه",
        price: "6.99",
        image:
          "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop",
      },
    ],
  },
];

async function addQuickItems() {
  try {
    console.log("🚀 Adding quick items...");

    // Get existing categories
    const categories = await prisma.category.findMany({
      where: {
        menu: { restaurantId: RESTAURANT_ID },
        isActive: true,
      },
    });

    console.log(`✅ Found ${categories.length} categories`);

    let totalItemsAdded = 0;

    for (const categoryData of quickItems) {
      const category = categories.find(
        (cat) => cat.name === categoryData.categoryName
      );

      if (category) {
        console.log(`\n📁 Adding items to: ${category.name}`);

        for (let i = 0; i < categoryData.items.length; i++) {
          const itemData = categoryData.items[i];

          const item = await prisma.menuItem.create({
            data: {
              name: itemData.name,
              nameAr: itemData.nameAr,
              description: `Delicious ${itemData.name.toLowerCase()}`,
              descriptionAr: `${itemData.nameAr} لذيذ`,
              price: itemData.price,
              currency: "USD",
              image: itemData.image,
              sortOrder: 200 + i,
              isAvailable: true,
              extras: null,
              categoryId: category.id,
            },
          });

          console.log(`  ✅ ${item.name} - $${item.price}`);
          totalItemsAdded++;
        }
      } else {
        console.log(`⚠️ Category not found: ${categoryData.categoryName}`);
      }
    }

    console.log(`\n🎉 Added ${totalItemsAdded} items successfully!`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addQuickItems();
