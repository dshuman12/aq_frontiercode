import { db } from '@/db';
import { categories, items } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

// Direct query - no caching for products to ensure fresh data after mutations
export async function getProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}) {
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const search = params?.search || '';
  const categoryId = params?.categoryId;
  const offset = (page - 1) * limit;

  // Base conditions
  const conditions = [eq(items.isActive, true)];

  // Search condition
  if (search) {
    const searchLower = `%${search.toLowerCase()}%`;
    conditions.push(
      sql`(${items.productName} ILIKE ${searchLower} OR ${items.barcode} ILIKE ${searchLower} OR ${items.sku} ILIKE ${searchLower})`
    );
  }

  // Category condition
  if (categoryId && categoryId !== 'ALL') {
    conditions.push(eq(items.categoryId, categoryId));
  }

  const whereClause = and(...conditions);

  // Fetch Data
  const products = await db.query.items.findMany({
    where: whereClause,
    limit: limit,
    offset: offset,
    with: {
      category: true,
    },
    orderBy: (items, { desc }) => [desc(items.createdAt)],
  });

  // Fetch Total Count for Pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(items)
    .where(whereClause);

  const totalItems = Number(countResult[0]?.count || 0);
  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: products,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  };
}

// Categories can be cached since they change rarely
export const getCategories = unstable_cache(
  async () => {
    return db.select().from(categories);
  },
  ['categories-list'],
  { tags: ['categories'], revalidate: 300 }
);
