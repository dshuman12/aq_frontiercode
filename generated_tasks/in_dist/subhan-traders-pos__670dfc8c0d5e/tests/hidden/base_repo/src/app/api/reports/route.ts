import { db } from '@/db';
import { items, orders, purchaseOrders } from '@/db/schema';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const from = fromParam ? new Date(fromParam) : new Date(new Date().setHours(0, 0, 0, 0));
    const to = toParam ? new Date(toParam) : new Date(new Date().setHours(23, 59, 59, 999));

    if (toParam && !toParam.includes('T')) {
      to.setHours(23, 59, 59, 999);
    }

    const [allOrders, allItems, purchaseData] = await Promise.all([
      db.query.orders.findMany({
        where: and(gte(orders.createdAt, from), lte(orders.createdAt, to)),
        with: { customer: true, items: true },
        orderBy: [desc(orders.createdAt)],
      }),
      db.query.items.findMany({
        where: eq(items.isActive, true),
        with: { category: true },
      }),
      db.query.purchaseOrders.findMany({
        where: and(
          gte(purchaseOrders.purchaseDate, from),
          lte(purchaseOrders.purchaseDate, to)
        ),
        with: { supplier: true },
        orderBy: [desc(purchaseOrders.purchaseDate)],
      }),
    ]);

    const activeOrders = allOrders.filter((o) => o.orderStatus !== 'CANCELLED');

    // ── Overview Metrics ───────────────────────────────────────────────────────
    const totalRevenue = activeOrders.reduce((acc, o) => acc + parseFloat(o.totalPrice), 0);
    const totalProfit = activeOrders.reduce((acc, o) => acc + parseFloat(o.totalProfit), 0);
    const totalDiscount = activeOrders.reduce((acc, o) => acc + parseFloat(o.totalDiscount), 0);
    const totalOutstanding = activeOrders.reduce((acc, o) => acc + parseFloat(o.outstandingAmount), 0);
    const avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;
    const cancelledOrders = allOrders.filter((o) => o.orderStatus === 'CANCELLED').length;

    // ── Daily Breakdown ────────────────────────────────────────────────────────
    const dailyMap = new Map<string, { date: string; revenue: number; profit: number; orders: number }>();
    for (const o of activeOrders) {
      const dateKey = o.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) ?? { date: dateKey, revenue: 0, profit: 0, orders: 0 };
      dailyMap.set(dateKey, {
        date: dateKey,
        revenue: existing.revenue + parseFloat(o.totalPrice),
        profit: existing.profit + parseFloat(o.totalProfit),
        orders: existing.orders + 1,
      });
    }
    const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // ── Payment Method Split ───────────────────────────────────────────────────
    const paymentMap = new Map<string, { count: number; amount: number }>();
    for (const o of activeOrders) {
      if (!o.paymentMethod) continue;
      const existing = paymentMap.get(o.paymentMethod) ?? { count: 0, amount: 0 };
      paymentMap.set(o.paymentMethod, {
        count: existing.count + 1,
        amount: existing.amount + parseFloat(o.totalPrice),
      });
    }
    const paymentMethodSplit = Array.from(paymentMap.entries()).map(([method, data]) => ({
      method,
      ...data,
    }));

    // ── Order Status Split ─────────────────────────────────────────────────────
    const statusMap = new Map<string, number>();
    for (const o of allOrders) {
      statusMap.set(o.orderStatus, (statusMap.get(o.orderStatus) ?? 0) + 1);
    }
    const orderStatusSplit = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    // ── Top Products ───────────────────────────────────────────────────────────
    const productMap = new Map<
      string,
      { name: string; unitsSold: number; revenue: number; profit: number }
    >();
    for (const o of activeOrders) {
      for (const item of o.items) {
        const key = item.productNameSnapshot;
        const existing = productMap.get(key) ?? { name: key, unitsSold: 0, revenue: 0, profit: 0 };
        productMap.set(key, {
          name: key,
          unitsSold: existing.unitsSold + item.quantity,
          revenue: existing.revenue + parseFloat(item.itemTotal),
          profit: existing.profit + parseFloat(item.itemProfit),
        });
      }
    }
    const topProducts = Array.from(productMap.values())
      .map((p) => ({
        ...p,
        margin: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    // ── Top Customers ──────────────────────────────────────────────────────────
    const customerMap = new Map<
      string,
      { name: string; orders: number; totalSpend: number; outstanding: number }
    >();
    for (const o of activeOrders) {
      const name = o.customer?.name ?? o.walkInCustomerName ?? 'Walk-in';
      const key = o.customerId ?? `walkin_${name}`;
      const existing = customerMap.get(key) ?? { name, orders: 0, totalSpend: 0, outstanding: 0 };
      customerMap.set(key, {
        name,
        orders: existing.orders + 1,
        totalSpend: existing.totalSpend + parseFloat(o.totalPrice),
        outstanding: existing.outstanding + parseFloat(o.outstandingAmount),
      });
    }
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 15);

    // ── Inventory Snapshot ─────────────────────────────────────────────────────
    const lowStockItems = allItems.filter((i) => i.quantity > 0 && i.quantity <= i.minStockLevel);
    const outOfStockItems = allItems.filter((i) => i.quantity === 0);
    const totalStockValue = allItems.reduce((acc, i) => {
      const cost = parseFloat(i.costPrice ?? '0');
      return acc + cost * i.quantity;
    }, 0);

    // ── Purchase Summary ───────────────────────────────────────────────────────
    const totalPurchased = purchaseData.reduce((acc, p) => acc + parseFloat(p.totalAmount), 0);
    const totalPaid = purchaseData.reduce((acc, p) => acc + parseFloat(p.paidAmount), 0);
    const totalDue = purchaseData.reduce((acc, p) => acc + parseFloat(p.remainingAmount), 0);

    return NextResponse.json({
      overview: {
        totalRevenue,
        totalProfit,
        totalOrders: activeOrders.length,
        avgOrderValue,
        totalDiscount,
        totalOutstanding,
        cancelledOrders,
      },
      dailyBreakdown,
      paymentMethodSplit,
      orderStatusSplit,
      topProducts,
      topCustomers,
      inventory: {
        totalProducts: allItems.length,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        totalStockValue,
        lowStockItems: [...lowStockItems, ...outOfStockItems].slice(0, 50).map((i) => ({
          id: i.id,
          name: i.productName,
          quantity: i.quantity,
          minStockLevel: i.minStockLevel,
          category: i.category?.name ?? null,
        })),
      },
      purchases: {
        totalPurchased,
        totalPaid,
        totalDue,
        orders: purchaseData.map((p) => ({
          id: p.id,
          supplierName: p.supplier?.name ?? 'Unknown',
          date: p.purchaseDate,
          amount: parseFloat(p.totalAmount),
          paid: parseFloat(p.paidAmount),
          remaining: parseFloat(p.remainingAmount),
          notes: p.notes ?? null,
        })),
      },
      orders: allOrders.map((o) => ({
        id: o.id,
        invoiceId: o.invoiceId,
        createdAt: o.createdAt,
        customerName: o.customer?.name ?? o.walkInCustomerName ?? null,
        itemCount: o.items?.length ?? 0,
        subtotal: parseFloat(o.subtotal),
        totalDiscount: parseFloat(o.totalDiscount),
        totalPrice: parseFloat(o.totalPrice),
        totalProfit: parseFloat(o.totalProfit),
        paidAmount: parseFloat(o.paidAmount),
        outstandingAmount: parseFloat(o.outstandingAmount),
        paymentMethod: o.paymentMethod ?? null,
        orderStatus: o.orderStatus,
        isWholesale: o.isWholesale,
      })),
    });
  } catch (error) {
    console.error('Reports API Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch reports', error: String(error) },
      { status: 500 }
    );
  }
}
