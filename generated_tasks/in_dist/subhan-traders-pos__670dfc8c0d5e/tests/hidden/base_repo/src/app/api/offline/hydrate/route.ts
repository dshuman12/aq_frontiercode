import { db } from '@/db';
import { categories, customers, employees, items, orders, purchaseOrders, suppliers } from '@/db/schema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parallelize ALL database queries for maximum performance
    const [
      allItems,
      allCustomers,
      allCategories,
      allSuppliers,
      allEmployees,
      allPurchaseOrders,
      recentOrders,
      todayOrders,
      pendingPayments,
      lowStockItems,
    ] = await Promise.all([
      // Fetch all active items
      db.select().from(items).where(eq(items.isActive, true)),
      
      // Fetch all active customers
      db.select().from(customers).where(eq(customers.isActive, true)),
      
      // Fetch all categories
      db.select().from(categories),
      
      // Fetch all suppliers
      db.select().from(suppliers),
      
      // Fetch all employees
      db.select().from(employees),
      
      // Fetch all purchase orders with supplier info
      db.query.purchaseOrders.findMany({
        orderBy: [desc(purchaseOrders.purchaseDate)],
        with: {
          supplier: true,
          items: true,
        },
      }),
      
      // Fetch recent orders (last 100) with customer info
      db.query.orders.findMany({
        limit: 100,
        orderBy: [desc(orders.createdAt)],
        with: {
          customer: true,
        },
      }),
      
      // Today's stats
      db.select({
        count: sql<number>`count(*)::int`,
        totalSales: sql<number>`COALESCE(sum(${orders.totalPrice}::numeric), 0)::float`,
        totalProfit: sql<number>`COALESCE(sum(${orders.totalProfit}::numeric), 0)::float`,
      })
      .from(orders)
      .where(gte(orders.createdAt, today)),
      
      // Pending payments (outstanding > 0)
      db.select({
        total: sql<number>`COALESCE(sum(${orders.outstandingAmount}::numeric), 0)::float`,
      })
      .from(orders)
      .where(eq(orders.orderStatus, 'PENDING')),
      
      // Low stock count
      db.select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(
        and(
          eq(items.isActive, true),
          sql`${items.quantity} <= ${items.minStockLevel}`
        )
      ),
    ]);

    const dashboard = {
      todaySales: todayOrders[0]?.totalSales || 0,
      todayOrders: todayOrders[0]?.count || 0,
      todayProfit: todayOrders[0]?.totalProfit || 0,
      pendingPayments: pendingPayments[0]?.total || 0,
      lowStockCount: lowStockItems[0]?.count || 0,
      totalCustomers: allCustomers.length,
      totalProducts: allItems.length,
      recentOrders: recentOrders.slice(0, 5),
    };

    return NextResponse.json({
      items: allItems,
      customers: allCustomers,
      categories: allCategories,
      suppliers: allSuppliers,
      employees: allEmployees,
      purchaseOrders: allPurchaseOrders,
      orders: recentOrders,
      dashboard,
    });
  } catch (error) {
    console.error('Hydration API Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch hydration data', error: String(error) },
      { status: 500 }
    );
  }
}

