const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Restaurant ID
const RESTAURANT_ID = 'cmg3rc496000312hmdgh2mvoa';

// Sample items to add to existing categories
const itemsByCategory = {
  'Appetizers': [
    {
      name: 'Mozzarella Sticks',
      nameAr: 'عصي الموزاريلا',
      description: 'Crispy mozzarella sticks with marinara sauce',
      descriptionAr: 'عصي موزاريلا مقرمشة مع صلصة المارينارا',
      price: '11.99',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      extras: [
        { name: 'Extra Marinara', nameAr: 'مارينارا إضافية', price: 1 },
        { name: 'Ranch Dressing', nameAr: 'صلصة الرانش', price: 1 }
      ]
    },
    {
      name: 'Nachos Supreme',
      nameAr: 'ناتشوز سوبريم',
      description: 'Loaded nachos with cheese, jalapeños, and sour cream',
      descriptionAr: 'ناتشوز محملة بالجبن والفلفل الحار والقشدة الحامضة',
      price: '13.99',
      image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
      extras: [
        { name: 'Extra Cheese', nameAr: 'جبن إضافي', price: 2 },
        { name: 'Guacamole', nameAr: 'جواكامولي', price: 3 }
      ]
    }
  ],
  'Main Courses': [
    {
      name: 'Fish and Chips',
      nameAr: 'سمك ورقائق البطاطس',
      description: 'Beer-battered fish with crispy fries',
      descriptionAr: 'سمك مقلي بطبقة البيرة مع رقائق البطاطس المقرمشة',
      price: '16.99',
      image: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=400&h=300&fit=crop',
      extras: [
        { name: 'Extra Tartar Sauce', nameAr: 'صلصة التارتار إضافية', price: 1 },
        { name: 'Malt Vinegar', nameAr: 'خل الشعير', price: 0.5 }
      ]
    },
    {
      name: 'Lamb Chops',
      nameAr: 'قطع لحم الضأن',
      description: 'Grilled lamb chops with rosemary and garlic',
      descriptionAr: 'قطع لحم ضأن مشوية مع إكليل الجبل والثوم',
      price: '28.99',
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
      extras: [
        { name: 'Mint Jelly', nameAr: 'جيلي النعناع', price: 2 },
        { name: 'Red Wine Sauce', nameAr: 'صلصة النبيذ الأحمر', price: 3 }
      ]
    }
  ],
  'Pizza': [
    {
      name: 'BBQ Chicken Pizza',
      nameAr: 'بيتزا دجاج الباربكيو',
      description: 'Grilled chicken with BBQ sauce and red onions',
      descriptionAr: 'دجاج مشوي مع صلصة الباربكيو والبصل الأحمر',
      price: '21.99',
      image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop',
      extras: [
        { name: 'Extra BBQ Sauce', nameAr: 'صلصة الباربكيو إضافية', price: 2 },
        { name: 'Cilantro', nameAr: 'الكزبرة', price: 1 }
      ]
    },
    {
      name: 'Supreme Pizza',
      nameAr: 'بيتزا سوبريم',
      description: 'Pepperoni, sausage, mushrooms, peppers, and onions',
      descriptionAr: 'بيبروني، نقانق، مشروم، فلفل، وبصل',
      price: '23.99',
      image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop',
      extras: [
        { name: 'Extra Toppings', nameAr: 'إضافات إضافية', price: 4 },
        { name: 'Extra Cheese', nameAr: 'جبن إضافي', price: 3 }
      ]
    }
  ],
  'Beverages': [
    {
      name: 'Fresh Lemonade',
      nameAr: 'ليمونادة طازجة',
      description: 'Homemade lemonade with fresh lemons',
      descriptionAr: 'ليمونادة منزلية مع ليمون طازج',
      price: '4.99',
      image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop',
      extras: [
        { name: 'Extra Sugar', nameAr: 'سكر إضافي', price: 0 },
        { name: 'Mint Leaves', nameAr: 'أوراق النعناع', price: 1 }
      ]
    },
    {
      name: 'Smoothie Bowl',
      nameAr: 'وعاء السموذي',
      description: 'Acai bowl with fresh fruits and granola',
      descriptionAr: 'وعاء أكاي مع فواكه طازجة وجرانولا',
      price: '8.99',
      image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&h=300&fit=crop',
      extras: [
        { name: 'Extra Berries', nameAr: 'توت إضافي', price: 2 },
        { name: 'Protein Powder', nameAr: 'بودرة البروتين', price: 3 }
      ]
    }
  ],
  'Desserts': [
    {
      name: 'Cheesecake',
      nameAr: 'كعكة الجبن',
      description: 'New York style cheesecake with berry compote',
      descriptionAr: 'كعكة جبن على الطريقة النيويوركية مع كومبوت التوت',
      price: '7.99',
      image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop',
      extras: [
        { name: 'Extra Compote', nameAr: 'كومبوت إضافي', price: 2 },
        { name: 'Whipped Cream', nameAr: 'كريمة مخفوقة', price: 1 }
      ]
    },
    {
      name: 'Apple Pie',
      nameAr: 'فطيرة التفاح',
      description: 'Warm apple pie with vanilla ice cream',
      descriptionAr: 'فطيرة تفاح دافئة مع آيس كريم الفانيليا',
      price: '6.99',
      image: 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=300&fit=crop',
      extras: [
        { name: 'Extra Ice Cream', nameAr: 'آيس كريم إضافي', price: 2 },
        { name: 'Caramel Sauce', nameAr: 'صلصة الكراميل', price: 1 }
      ]
    }
  ]
};

async function addItemsToExistingCategories() {
  try {
    console.log('🚀 Starting to add items to existing categories...');

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: RESTAURANT_ID }
    });

    if (!restaurant) {
      console.error('❌ Restaurant not found with ID:', RESTAURANT_ID);
      return;
    }

    console.log('✅ Restaurant found:', restaurant.name);

    // Get existing categories
    const categories = await prisma.category.findMany({
      where: {
        menu: { restaurantId: RESTAURANT_ID },
        isActive: true
      }
    });

    console.log(`✅ Found ${categories.length} existing categories`);

    let totalItemsAdded = 0;

    // Add items to each category
    for (const category of categories) {
      const itemsToAdd = itemsByCategory[category.name];
      
      if (itemsToAdd) {
        console.log(`\n📁 Adding items to category: ${category.name}`);
        
        for (let i = 0; i < itemsToAdd.length; i++) {
          const itemData = itemsToAdd[i];
          console.log(`  🍽️ Adding item: ${itemData.name}`);

          const item = await prisma.menuItem.create({
            data: {
              name: itemData.name,
              nameAr: itemData.nameAr,
              description: itemData.description,
              descriptionAr: itemData.descriptionAr,
              price: itemData.price,
              currency: 'USD',
              image: itemData.image,
              sortOrder: 100 + i, // Start from 100 to avoid conflicts
              isAvailable: true,
              extras: itemData.extras,
              categoryId: category.id
            }
          });

          console.log(`  ✅ Created item: ${item.name} - $${item.price}`);
          totalItemsAdded++;
        }
      } else {
        console.log(`⚠️ No items defined for category: ${category.name}`);
      }
    }

    console.log('\n🎉 Items added successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Items added: ${totalItemsAdded}`);
    console.log(`   - Restaurant: ${restaurant.name}`);

  } catch (error) {
    console.error('❌ Error adding items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addItemsToExistingCategories();
