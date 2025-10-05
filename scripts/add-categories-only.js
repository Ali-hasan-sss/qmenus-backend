const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Restaurant ID
const RESTAURANT_ID = 'cmg3rc496000312hmdgh2mvoa';

// Sample categories only (without items)
const categories = [
  {
    name: 'Appetizers',
    nameAr: 'مقبلات',
    description: 'Start your meal with our delicious appetizers',
    descriptionAr: 'ابدأ وجبتك بمقبلاتنا اللذيذة',
    image: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?w=400&h=300&fit=crop',
    sortOrder: 1
  },
  {
    name: 'Main Courses',
    nameAr: 'الأطباق الرئيسية',
    description: 'Our signature main dishes',
    descriptionAr: 'أطباقنا الرئيسية المميزة',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    sortOrder: 2
  },
  {
    name: 'Pizza',
    nameAr: 'بيتزا',
    description: 'Authentic Italian pizzas made fresh daily',
    descriptionAr: 'بيتزا إيطالية أصيلة تُحضر طازجة يومياً',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
    sortOrder: 3
  },
  {
    name: 'Beverages',
    nameAr: 'مشروبات',
    description: 'Refreshing drinks and beverages',
    descriptionAr: 'مشروبات منعشة',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
    sortOrder: 4
  },
  {
    name: 'Desserts',
    nameAr: 'حلويات',
    description: 'Sweet endings to your meal',
    descriptionAr: 'نهايات حلوة لوجبتك',
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop',
    sortOrder: 5
  },
  {
    name: 'Seafood',
    nameAr: 'مأكولات بحرية',
    description: 'Fresh seafood dishes',
    descriptionAr: 'أطباق مأكولات بحرية طازجة',
    image: 'https://images.unsplash.com/photo-1553909489-cd47e0ef937f?w=400&h=300&fit=crop',
    sortOrder: 6
  },
  {
    name: 'Vegetarian',
    nameAr: 'نباتي',
    description: 'Healthy vegetarian options',
    descriptionAr: 'خيارات نباتية صحية',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    sortOrder: 7
  },
  {
    name: 'Kids Menu',
    nameAr: 'قائمة الأطفال',
    description: 'Special meals for children',
    descriptionAr: 'وجبات خاصة للأطفال',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    sortOrder: 8
  }
];

async function addCategoriesOnly() {
  try {
    console.log('🚀 Starting to add categories...');

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: RESTAURANT_ID }
    });

    if (!restaurant) {
      console.error('❌ Restaurant not found with ID:', RESTAURANT_ID);
      return;
    }

    console.log('✅ Restaurant found:', restaurant.name);

    // Create or find menu
    let menu = await prisma.menu.findFirst({
      where: { restaurantId: RESTAURANT_ID }
    });

    if (!menu) {
      menu = await prisma.menu.create({
        data: {
          name: 'Main Menu',
          nameAr: 'القائمة الرئيسية',
          restaurantId: RESTAURANT_ID,
          isActive: true
        }
      });
      console.log('✅ Created menu:', menu.name);
    } else {
      console.log('✅ Found existing menu:', menu.name);
    }

    // Add categories
    for (const categoryData of categories) {
      console.log(`📁 Adding category: ${categoryData.name}`);

      const category = await prisma.category.create({
        data: {
          name: categoryData.name,
          nameAr: categoryData.nameAr,
          description: categoryData.description,
          descriptionAr: categoryData.descriptionAr,
          image: categoryData.image,
          sortOrder: categoryData.sortOrder,
          isActive: true,
          menuId: menu.id
        }
      });

      console.log(`✅ Created category: ${category.name} (${category.nameAr})`);
    }

    console.log('\n🎉 Categories added successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Restaurant: ${restaurant.name}`);

  } catch (error) {
    console.error('❌ Error adding categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addCategoriesOnly();
