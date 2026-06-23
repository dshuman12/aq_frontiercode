import { db } from '@/db';
import { orders, payments, orderItems } from '@/db/schema';
import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';
  const fromDateStr = searchParams.get('from');
  const toDateStr = searchParams.get('to');

  try {
    const offset = (page - 1) * limit;

    const conditions = [eq(orders.customerId, id)];

    if (fromDateStr) {
        const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
        conditions.push(gte(orders.createdAt, fromDate));
    }

    if (toDateStr) {
        const toDate = new Date(`${toDateStr}T23:59:59.999Z`);
        conditions.push(lte(orders.createdAt, toDate));
    }

    if (search) {
        // Search by invoice ID or item product name
        const searchPattern = `%${search}%`;
        conditions.push(
            or(
                ilike(orders.invoiceId, searchPattern),
                sql`EXISTS (
                    SELECT 1 FROM ${orderItems} 
                    WHERE ${orderItems.orderId} = ${orders.id} 
                    AND ${orderItems.productNameSnapshot} ILIKE ${searchPattern}
                )`
            )!
        );
    }

    const whereClause = conditions.length > 1 ? and(...conditions)! : conditions[0];

    // Fetch total records for pagination metadata
    const [{ count }] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(orders)
      .where(whereClause);

    const dataRows = await db.query.orders.findMany({
      where: whereClause,
      with: {
        items: true,
        payments: {
          orderBy: [desc(payments.paymentDate)]
        }
      },
      orderBy: [desc(orders.createdAt)],
      limit,
      offset,
    });

    const hasMore = offset + dataRows.length < count;

    return NextResponse.json({
        data: dataRows,
        metadata: {
            totalRecords: count,
            hasMore,
            page,
            limit
        }
    });
  } catch (error) {
    console.error('Customer Orders API Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch customer orders', error: String(error) },
      { status: 500 }
    );
  }
}
