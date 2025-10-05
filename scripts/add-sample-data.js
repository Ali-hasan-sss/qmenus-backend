const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Restaurant ID
const RESTAURANT_ID = 'cmg3rc496000312hmdgh2mvoa';

// Sample categories with Unsplash images
const categories = [
  {
    name: 'Appetizers',
    nameAr: 'مقبلات',
    description: 'Start your meal with our delicious appetizers',
    descriptionAr: 'ابدأ وجبتك بمقبلاتنا اللذيذة',
    image: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?w=400&h=300&fit=crop',
    sortOrder: 1,
    items: [
      {
        name: 'Caesar Salad',
        nameAr: 'سلطة سيزر',
        description: 'Fresh romaine lettuce with parmesan cheese and croutons',
        descriptionAr: 'خس طازج مع جبن البارميزان والخبز المحمص',
        price: '12.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop',
        sortOrder: 1,
        extras: null
      },
      {
        name: 'Bruschetta',
        nameAr: 'بروشيتا',
        description: 'Toasted bread with tomatoes, basil, and olive oil',
        descriptionAr: 'خبز محمص مع الطماطم والريحان وزيت الزيتون',
        price: '9.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1572441713132-51c75654db73?w=400&h=300&fit=crop',
        sortOrder: 2,
        extras: null
      },
      {
        name: 'Chicken Wings',
        nameAr: 'أجنحة الدجاج',
        description: 'Crispy chicken wings with your choice of sauce',
        descriptionAr: 'أجنحة دجاج مقرمشة مع الصلصة التي تختارها',
        price: '14.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1567620832904-9fe5cf23db13?w=400&h=300&fit=crop',
        sortOrder: 3,
        extras: [
          { name: 'Buffalo Sauce', nameAr: 'صلصة البافلو', price: 0 },
          { name: 'BBQ Sauce', nameAr: 'صلصة الباربكيو', price: 0 },
          { name: 'Honey Mustard', nameAr: 'عسل الخردل', price: 0 }
        ]
      }
    ]
  },
  {
    name: 'Main Courses',
    nameAr: 'الأطباق الرئيسية',
    description: 'Our signature main dishes',
    descriptionAr: 'أطباقنا الرئيسية المميزة',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    sortOrder: 2,
    items: [
      {
        name: 'Grilled Salmon',
        nameAr: 'سلمون مشوي',
        description: 'Fresh Atlantic salmon grilled to perfection',
        descriptionAr: 'سلمون أطلنطي طازج مشوي إلى الكمال',
        price: '24.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
        sortOrder: 1,
        extras: [
          { name: 'Extra Lemon', nameAr: 'ليمون إضافي', price: 1 },
          { name: 'Herb Butter', nameAr: 'زبدة الأعشاب', price: 2 }
        ]
      },
      {
        name: 'Beef Steak',
        nameAr: 'ستيك اللحم',
        description: 'Premium ribeye steak cooked to your preference',
        descriptionAr: 'ستيك ريب آي ممتاز مطبوخ حسب تفضيلك',
        price: '32.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
        sortOrder: 2,
        extras: [
          { name: 'Mushroom Sauce', nameAr: 'صلصة المشروم', price: 3 },
          { name: 'Garlic Butter', nameAr: 'زبدة الثوم', price: 2 },
          { name: 'Peppercorn Sauce', nameAr: 'صلصة الفلفل الأسود', price: 3 }
        ]
      },
      {
        name: 'Chicken Parmesan',
        nameAr: 'دجاج بارميزان',
        description: 'Breaded chicken breast with marinara and mozzarella',
        descriptionAr: 'صدر دجاج مقلي مع صلصة المارينارا والموزاريلا',
        price: '18.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
        sortOrder: 3,
        extras: [
          { name: 'Extra Cheese', nameAr: 'جبن إضافي', price: 2 },
          { name: 'Side Pasta', nameAr: 'باستا جانبية', price: 4 }
        ]
      }
    ]
  },
  {
    name: 'Pizza',
    nameAr: 'بيتزا',
    description: 'Authentic Italian pizzas made fresh daily',
    descriptionAr: 'بيتزا إيطالية أصيلة تُحضر طازجة يومياً',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
    sortOrder: 3,
    items: [
      {
        name: 'Margherita Pizza',
        nameAr: 'بيتزا مارجريتا',
        description: 'Classic pizza with tomato, mozzarella, and basil',
        descriptionAr: 'بيتزا كلاسيكية مع الطماطم والموزاريلا والريحان',
        price: '16.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop',
        sortOrder: 1,
        extras: [
          { name: 'Extra Cheese', nameAr: 'جبن إضافي', price: 2 },
          { name: 'Fresh Basil', nameAr: 'ريحان طازج', price: 1 }
        ]
      },
      {
        name: 'Pepperoni Pizza',
        nameAr: 'بيتزا بيبروني',
        description: 'Pepperoni with mozzarella on our signature crust',
        descriptionAr: 'بيبروني مع الموزاريلا على عجينتنا المميزة',
        price: '19.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop',
        sortOrder: 2,
        extras: [
          { name: 'Extra Pepperoni', nameAr: 'بيبروني إضافي', price: 3 },
          { name: 'Spicy Oil', nameAr: 'زيت حار', price: 1 }
        ]
      },
      {
        name: 'Vegetarian Pizza',
        nameAr: 'بيتزا نباتية',
        description: 'Fresh vegetables and mozzarella on thin crust',
        descriptionAr: 'خضار طازجة وموزاريلا على عجينة رفيعة',
        price: '17.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop',
        sortOrder: 3,
        extras: [
          { name: 'Extra Vegetables', nameAr: 'خضار إضافية', price: 2 },
          { name: 'Vegan Cheese', nameAr: 'جبن نباتي', price: 3 }
        ]
      }
    ]
  },
  {
    name: 'Beverages',
    nameAr: 'مشروبات',
    description: 'Refreshing drinks and beverages',
    descriptionAr: 'مشروبات منعشة',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
    sortOrder: 4,
    items: [
      {
        name: 'Fresh Orange Juice',
        nameAr: 'عصير برتقال طازج',
        description: 'Freshly squeezed orange juice',
        descriptionAr: 'عصير برتقال معصور طازج',
        price: '5.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop',
        sortOrder: 1,
        extras: null
      },
      {
        name: 'Iced Coffee',
        nameAr: 'قهوة مثلجة',
        description: 'Cold brew coffee with ice',
        descriptionAr: 'قهوة باردة مع الثلج',
        price: '4.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop',
        sortOrder: 2,
        extras: [
          { name: 'Extra Shot', nameAr: 'جرعة إضافية', price: 1 },
          { name: 'Oat Milk', nameAr: 'حليب الشوفان', price: 0.5 },
          { name: 'Vanilla Syrup', nameAr: 'شراب الفانيليا', price: 0.5 }
        ]
      },
      {
        name: 'Green Tea',
        nameAr: 'شاي أخضر',
        description: 'Premium green tea leaves',
        descriptionAr: 'أوراق الشاي الأخضر المميزة',
        price: '3.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
        sortOrder: 3,
        extras: [
          { name: 'Honey', nameAr: 'عسل', price: 1 },
          { name: 'Lemon', nameAr: 'ليمون', price: 0.5 }
        ]
      }
    ]
  },
  {
    name: 'Desserts',
    nameAr: 'حلويات',
    description: 'Sweet endings to your meal',
    descriptionAr: 'نهايات حلوة لوجبتك',
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop',
    sortOrder: 5,
    items: [
      {
        name: 'Chocolate Cake',
        nameAr: 'كعكة الشوكولاتة',
        description: 'Rich chocolate cake with chocolate ganache',
        descriptionAr: 'كعكة شوكولاتة غنية مع غاناش الشوكولاتة',
        price: '8.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
        sortOrder: 1,
        extras: [
          { name: 'Extra Ganache', nameAr: 'غاناش إضافي', price: 2 },
          { name: 'Vanilla Ice Cream', nameAr: 'آيس كريم فانيليا', price: 3 }
        ]
      },
      {
        name: 'Tiramisu',
        nameAr: 'تيراميسو',
        description: 'Classic Italian dessert with coffee and mascarpone',
        descriptionAr: 'حلوة إيطالية كلاسيكية مع القهوة والمسكربون',
        price: '9.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
        sortOrder: 2,
        extras: [
          { name: 'Extra Cocoa', nameAr: 'كاكاو إضافي', price: 1 },
          { name: 'Coffee Liqueur', nameAr: 'ليكور القهوة', price: 2 }
        ]
      },
      {
        name: 'Ice Cream Sundae',
        nameAr: 'سانديه الآيس كريم',
        description: 'Three scoops of vanilla ice cream with toppings',
        descriptionAr: 'ثلاث كرات من آيس كريم الفانيليا مع الإضافات',
        price: '7.99',
        currency: 'USD',
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop',
        sortOrder: 3,
        extras: [
          { name: 'Chocolate Sauce', nameAr: 'صلصة الشوكولاتة', price: 1 },
          { name: 'Caramel Sauce', nameAr: 'صلصة الكراميل', price: 1 },
          { name: 'Whipped Cream', nameAr: 'كريمة مخفوقة', price: 1 }
        ]
      }
    ]
  }
];

async function addSampleData() {
  try {
    console.log('🚀 Starting to add sample data...');

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

    // Add categories and items
    for (const categoryData of categories) {
      console.log(`\n📁 Adding category: ${categoryData.name}`);

      // Create category
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

      console.log(`✅ Created category: ${category.name}`);

      // Add items to category
      for (const itemData of categoryData.items) {
        console.log(`  🍽️ Adding item: ${itemData.name}`);

        const item = await prisma.menuItem.create({
          data: {
            name: itemData.name,
            nameAr: itemData.nameAr,
            description: itemData.description,
            descriptionAr: itemData.descriptionAr,
            price: itemData.price,
            currency: itemData.currency,
            image: itemData.image,
            sortOrder: itemData.sortOrder,
            isAvailable: true,
            extras: itemData.extras,
            categoryId: category.id
          }
        });

        console.log(`  ✅ Created item: ${item.name} - $${item.price}`);
      }
    }

    console.log('\n🎉 Sample data added successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Total items: ${categories.reduce((total, cat) => total + cat.items.length, 0)}`);
    console.log(`   - Restaurant: ${restaurant.name}`);

  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addSampleData();
