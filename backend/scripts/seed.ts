/**
 * Database seeding script
 * 
 * Populates the database with:
 * - 120-200 products across 6 categories and ~10 brands
 * - Starter cart for demo-user with 2-4 items
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import { Product, Cart } from '../src/models';
import { logger } from '../src/utils/logger';

dotenv.config();

// Deterministic seed for reproducibility
faker.seed(12345);

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home & Kitchen',
  'Sports & Outdoors',
  'Books',
  'Toys & Games',
];

const BRANDS = [
  'TechPro',
  'StyleMax',
  'HomeEssentials',
  'ActiveLife',
  'ReadWell',
  'PlayFun',
  'PremiumChoice',
  'ValueBrand',
  'EcoFriendly',
  'LuxuryLine',
];

// Category-specific product types for more realistic data
const PRODUCT_TYPES: Record<string, string[]> = {
  Electronics: [
    'Wireless Headphones',
    'Smart Watch',
    'Bluetooth Speaker',
    'USB-C Cable',
    'Power Bank',
    'Laptop Stand',
    'Wireless Mouse',
    'Keyboard',
    'Webcam',
    'Phone Case',
  ],
  Clothing: [
    'Cotton T-Shirt',
    'Denim Jeans',
    'Running Shoes',
    'Hoodie',
    'Sneakers',
    'Jacket',
    'Shorts',
    'Socks',
    'Cap',
    'Backpack',
  ],
  'Home & Kitchen': [
    'Coffee Maker',
    'Blender',
    'Cookware Set',
    'Dinner Plates',
    'Storage Container',
    'Kitchen Knife',
    'Cutting Board',
    'Towel Set',
    'Trash Can',
    'Utensil Set',
  ],
  'Sports & Outdoors': [
    'Yoga Mat',
    'Dumbbell Set',
    'Water Bottle',
    'Resistance Bands',
    'Jump Rope',
    'Camping Tent',
    'Sleeping Bag',
    'Hiking Backpack',
    'Bicycle Helmet',
    'Running Belt',
  ],
  Books: [
    'Fiction Novel',
    'Self-Help Book',
    'Cookbook',
    'Biography',
    'Mystery Thriller',
    'Science Fiction',
    'Business Guide',
    'Travel Guide',
    'Art Book',
    'Children\'s Book',
  ],
  'Toys & Games': [
    'Board Game',
    'Puzzle Set',
    'Action Figure',
    'Building Blocks',
    'Stuffed Animal',
    'Card Game',
    'Educational Toy',
    'Remote Control Car',
    'Doll House',
    'Art Supplies',
  ],
};

const PRODUCT_COUNT = 150; // Between 120-200
const DEMO_USER_ID = 'demo-user';
const DEMO_CART_ITEMS_COUNT = 3; // 2-4 items

interface ProductSeed {
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
  reserved: number;
  lowStockThreshold: number;
  image: string;
}

function generateProducts(): ProductSeed[] {
  const products: ProductSeed[] = [];
  const productsPerCategory = Math.floor(PRODUCT_COUNT / CATEGORIES.length);

  let skuCounter = 1;

  // Generate products for each category
  for (const category of CATEGORIES) {
    const productTypes = PRODUCT_TYPES[category];

    for (let i = 0; i < productsPerCategory; i++) {
      const brand = faker.helpers.arrayElement(BRANDS);
      const productType = faker.helpers.arrayElement(productTypes);
      
      // Add some variation to product names
      const adjectives = ['Premium', 'Deluxe', 'Pro', 'Elite', 'Classic', 'Modern', 'Essential'];
      const adjective = Math.random() > 0.5 ? faker.helpers.arrayElement(adjectives) + ' ' : '';

      products.push({
        sku: `${category.substring(0, 3).toUpperCase()}-${String(skuCounter).padStart(5, '0')}`,
        name: `${brand} ${adjective}${productType}`,
        priceCents: faker.number.int({ min: 199, max: 199990 }), // $1.99 to $1,999.90
        stock: faker.number.int({ min: 0, max: 150 }),
        reserved: 0,
        lowStockThreshold: faker.number.int({ min: 5, max: 15 }),
        image: `https://picsum.photos/seed/${skuCounter}/400/400`,
      });

      skuCounter++;
    }
  }

  // Fill remaining products to reach PRODUCT_COUNT
  while (products.length < PRODUCT_COUNT) {
    const category = faker.helpers.arrayElement(CATEGORIES);
    const brand = faker.helpers.arrayElement(BRANDS);
    const productType = faker.helpers.arrayElement(PRODUCT_TYPES[category]);

    products.push({
      sku: `${category.substring(0, 3).toUpperCase()}-${String(skuCounter).padStart(5, '0')}`,
      name: `${brand} ${productType}`,
      priceCents: faker.number.int({ min: 199, max: 199990 }),
      stock: faker.number.int({ min: 0, max: 150 }),
      reserved: 0,
      lowStockThreshold: faker.number.int({ min: 5, max: 15 }),
      image: `https://picsum.photos/seed/${skuCounter}/400/400`,
    });

    skuCounter++;
  }

  return products;
}

async function seed() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    logger.info('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Clear existing data (idempotent seeding)
    logger.info('Clearing existing products and carts...');
    await Product.deleteMany({});
    await Cart.deleteMany({});
    logger.info('Existing data cleared');

    // Generate and insert products
    logger.info(`Generating ${PRODUCT_COUNT} products...`);
    const products = generateProducts();
    const insertedProducts = await Product.insertMany(products);
    logger.info(`Inserted ${insertedProducts.length} products`);

    // Create demo user cart with random products
    logger.info(`Creating cart for ${DEMO_USER_ID}...`);
    const randomProducts = faker.helpers.arrayElements(
      insertedProducts,
      DEMO_CART_ITEMS_COUNT
    );

    const cartItems = randomProducts.map((product) => ({
      productId: product._id,
      qty: faker.number.int({ min: 1, max: 5 }),
    }));

    await Cart.create({
      userId: DEMO_USER_ID,
      items: cartItems,
    });

    logger.info(`Created cart for ${DEMO_USER_ID} with ${cartItems.length} items`);

    // Summary
    const summary = {
      products: insertedProducts.length,
      categories: CATEGORIES.length,
      brands: BRANDS.length,
      demoCart: {
        userId: DEMO_USER_ID,
        itemCount: cartItems.length,
      },
    };

    logger.info('Seeding completed successfully', summary);
    console.log('\n📊 Seed Summary:');
    console.log(`   Products: ${summary.products}`);
    console.log(`   Categories: ${summary.categories}`);
    console.log(`   Brands: ${summary.brands}`);
    console.log(`   Demo Cart: ${summary.demoCart.userId} (${summary.demoCart.itemCount} items)`);
  } catch (error) {
    logger.error('Seeding failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
