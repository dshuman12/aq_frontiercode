import { config } from 'dotenv';
config({ path: '.env' });

import { eq } from 'drizzle-orm';
import { auth } from '../../auth';
import { db } from '../index';
import { categories } from '../schema';
import { user } from '../auth-schema';

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Create Admin User via Better Auth API (handles hashing + account creation)
  const adminUsername = 'admin';
  const adminEmail = 'admin@subhantraders.com';

  const existingUser = await db
    .select()
    .from(user)
    .where(eq(user.email, adminEmail));

  if (existingUser.length === 0) {
    try {
      await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          name: 'Admin',
          password: 'admin123',
          username: adminUsername,
        },
      });
      console.log('✅ Admin user created (username: admin, password: admin123)');
    } catch (error) {
      console.error('❌ Failed to create admin user:', error);
    }
  } else {
    console.log('ℹ️ Admin user already exists');
  }

  // 2. Create Default Categories
  const defaultCategories = ['Cycles', 'Tyres', 'Tubes', 'Spare Parts', 'Accessories'];

  for (const catName of defaultCategories) {
    const existingCat = await db.select().from(categories).where(eq(categories.name, catName));
    if (existingCat.length === 0) {
      await db.insert(categories).values({
        name: catName,
      });
      console.log(`✅ Category created: ${catName}`);
    }
  }

  console.log('🌱 Seeding finished.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
