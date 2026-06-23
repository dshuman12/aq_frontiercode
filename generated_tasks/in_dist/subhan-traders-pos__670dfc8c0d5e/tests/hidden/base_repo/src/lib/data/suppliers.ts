import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { unstable_cache } from 'next/cache';

export const getSuppliers = unstable_cache(
  async () => {
    return db.select().from(suppliers);
  },
  ['suppliers-list'],
  { tags: ['suppliers'], revalidate: 60 }
);
