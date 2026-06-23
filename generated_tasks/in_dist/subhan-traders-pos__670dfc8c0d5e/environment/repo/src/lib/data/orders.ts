import { db } from '@/db';
import { customers, orders } from '@/db/schema';
import { desc, ilike, or, and, inArray, gte, lte, sql, count } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

export const getOrders = unstable_cache(
  async () => {
    return db.query.orders.findMany({
      with: {
        customer: true,
        items: true,
      },
      orderBy: [desc(orders.createdAt)],
    });
  },
  ['orders-list'],
  { tags: ['orders'], revalidate: 30 }
);

export const getRecentOrders = unstable_cache(
  async (limit: number = 5) => {
    return db.query.orders.findMany({
      limit,
      with: {
        customer: true,
      },
      orderBy: [desc(orders.createdAt)],
    });
  },
  ['recent-orders'],
  { tags: ['orders'], revalidate: 30 }
);

export async function getPaginatedOrders({
  search,
  from,
  to,
  page = 1,
  limit = 20,
}: {
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  let customerIds: string[] = [];
  
  if (search) {
    const searchPattern = `%${search}%`;
    const matchingCustomers = await db.select({ id: customers.id }).from(customers).where(
      or(
        ilike(customers.name, searchPattern),
        ilike(customers.phone, searchPattern)
      )
    );
    customerIds = matchingCustomers.map(c => c.id);
  }

  const offset = (page - 1) * limit;

  // Build the conditions correctly so we don't pass undefined to 'and' / 'or'
  const filterConditions = [];

  if (search) {
    const searchPattern = `%${search}%`;
    const searchCondition = customerIds.length > 0 
      ? or(
          ilike(orders.invoiceId, searchPattern),
          ilike(orders.walkInCustomerName, searchPattern),
          ilike(orders.walkInCustomerPhone, searchPattern),
          inArray(orders.customerId, customerIds)
        )
      : or(
          ilike(orders.invoiceId, searchPattern),
          ilike(orders.walkInCustomerName, searchPattern),
          ilike(orders.walkInCustomerPhone, searchPattern)
        );
    
    if (searchCondition) filterConditions.push(searchCondition);
  }

  if (from || to) {
    const dateConditions = [];
    
    if (from) {
      const startOfDay = new Date(`${from}T00:00:00.000Z`);
      dateConditions.push(gte(orders.createdAt, startOfDay));
    }
    
    if (to) {
      const endOfDay = new Date(`${to}T23:59:59.999Z`);
      dateConditions.push(lte(orders.createdAt, endOfDay));
    }
    
    if (dateConditions.length > 0) {
      filterConditions.push(and(...dateConditions));
    }
  }

  const whereCondition = filterConditions.length > 0 ? and(...filterConditions) : undefined;

  const [data, totalCountResult] = await Promise.all([
    db.query.orders.findMany({
      where: whereCondition,
      with: {
        customer: true,
        items: true,
      },
      orderBy: [desc(orders.createdAt)],
      limit,
      offset,
    }),
    db.select({ count: count() }).from(orders).where(whereCondition)
  ]);

  const totalRecords = totalCountResult[0].count;
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    data,
    metadata: {
      hasMore: page < totalPages,
      totalRecords,
      currentPage: page,
    }
  };
}
