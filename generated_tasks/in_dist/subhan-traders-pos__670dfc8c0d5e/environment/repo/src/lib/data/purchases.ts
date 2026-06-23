import { db } from '@/db';
import { purchaseOrders } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

export const getPurchases = unstable_cache(
  async () => {
    return db.query.purchaseOrders.findMany({
      with: {
        supplier: true,
        items: true,
      },
      orderBy: [desc(purchaseOrders.purchaseDate)],
    });
  },
  ['purchases-list'],
  { tags: ['purchases'], revalidate: 60 }
);
