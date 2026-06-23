import { getDashboardMetrics, getRecentSales } from '@/lib/data/dashboard';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [metrics, recentSales] = await Promise.all([
      getDashboardMetrics(),
      getRecentSales(),
    ]);

    return NextResponse.json({
      metrics: {
        revenue: metrics.revenue,
        ordersCount: metrics.ordersCount,
        lowStockCount: metrics.lowStockCount,
        customerCount: metrics.customerCount,
      },
      recentSales: recentSales.map(sale => ({
        id: sale.id,
        customerName: sale.customer?.name || null,
        orderStatus: sale.orderStatus,
        totalPrice: parseFloat(sale.totalPrice),
        createdAt: sale.createdAt,
      })),
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ message: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
