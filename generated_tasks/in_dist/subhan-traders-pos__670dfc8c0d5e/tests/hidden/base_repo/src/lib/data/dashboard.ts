import { db } from "@/db";
import { customers, items, orders } from "@/db/schema";
import { endOfDay, startOfDay } from "date-fns";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { unstable_cache } from 'next/cache';

export const getDashboardMetrics = unstable_cache(
  async () => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Execute all queries in parallel for better performance
    const [salesTodayResult, ordersTodayResult, lowStockResult, customersResult] = await Promise.all([
      // 1. Sales Today
      db.select({
        total: sql<number>`sum(cast(${orders.totalPrice} as numeric))`
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, todayStart),
          lte(orders.createdAt, todayEnd)
        )
      ),
      
      // 2. Total Orders Today
      db.select({
        count: sql<number>`count(*)`
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, todayStart),
          lte(orders.createdAt, todayEnd)
        )
      ),

      // 3. Low Stock Items
      db.select({
        count: sql<number>`count(*)`
      })
      .from(items)
      .where(
        and(
          eq(items.isActive, true),
          lte(items.quantity, items.minStockLevel)
        )
      ),

      // 4. Total Customers
      db.select({
        count: sql<number>`count(*)`
      }).from(customers)
    ]);

    return {
        revenue: Number(salesTodayResult[0]?.total || 0),
        ordersCount: Number(ordersTodayResult[0]?.count || 0),
        lowStockCount: Number(lowStockResult[0]?.count || 0),
        customerCount: Number(customersResult[0]?.count || 0)
    };
  },
  ['dashboard-metrics'],
  { tags: ['dashboard', 'orders', 'products', 'customers'], revalidate: 60 }
);

export const getRecentSales = unstable_cache(
  async () => {
    return await db.query.orders.findMany({
        limit: 5,
        orderBy: [desc(orders.createdAt)],
        with: {
            customer: true,
        }
    });
  },
  ['recent-sales'],
  { tags: ['orders'], revalidate: 60 }
);
