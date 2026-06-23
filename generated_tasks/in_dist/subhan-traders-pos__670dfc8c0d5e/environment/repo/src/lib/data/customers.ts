import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq, ilike, or } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

export const getCustomers = unstable_cache(
  async (query?: string) => {
    let whereClause = eq(customers.isActive, true);

    if (query) {
      const lowerQuery = `%${query}%`;
      whereClause = or(
        ilike(customers.name, lowerQuery),
        ilike(customers.phone, lowerQuery),
        ilike(customers.cnic, lowerQuery)
      ) as any;
    }

    return db.select().from(customers).where(whereClause).limit(100);
  },
  ['customers-list'],
  { tags: ['customers'], revalidate: 60 }
);

export const getAllCustomers = unstable_cache(
  async () => {
    return db.select().from(customers).where(eq(customers.isActive, true));
  },
  ['all-customers'],
  { tags: ['customers'], revalidate: 60 }
);

export async function getCustomerById(customerId: string) {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  return customer;
}
