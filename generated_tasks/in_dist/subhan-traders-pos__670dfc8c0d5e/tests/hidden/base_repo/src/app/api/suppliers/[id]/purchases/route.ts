import { db } from '@/db';
import { purchaseOrders, supplierPayments, purchaseOrderItems } from '@/db/schema';
import { and, desc, eq, gt, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const search = searchParams.get('search') || '';
  const fromDateStr = searchParams.get('from');
  const toDateStr = searchParams.get('to');

  try {
    const offset = (page - 1) * limit;

    const conditions = [eq(purchaseOrders.supplierId, id)];

    if (fromDateStr) {
        const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
        conditions.push(gte(purchaseOrders.purchaseDate, fromDate));
    }

    if (toDateStr) {
        const toDate = new Date(`${toDateStr}T23:59:59.999Z`);
        conditions.push(lte(purchaseOrders.purchaseDate, toDate));
    }

    if (search) {
        const searchPattern = `%${search}%`;
        const searchCondition = or(
            ilike(purchaseOrders.id, searchPattern),
            sql`EXISTS (
                SELECT 1 FROM ${purchaseOrderItems} 
                WHERE ${purchaseOrderItems.purchaseOrderId} = ${purchaseOrders.id} 
                AND ${purchaseOrderItems.productNameSnapshot} ILIKE ${searchPattern}
            )`
        );
        if (searchCondition) {
            conditions.push(searchCondition);
        }
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Fetch total records for pagination metadata
    const [{ count }] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(purchaseOrders)
      .where(whereClause);

    const pos = await db.query.purchaseOrders.findMany({
      where: whereClause,
      with: {
        items: true,
        payments: {
          orderBy: [desc(supplierPayments.paymentDate)]
        }
      },
      orderBy: [desc(purchaseOrders.purchaseDate)],
      limit,
      offset,
    });

    const hasMore = offset + pos.length < count;

    return NextResponse.json({
        data: pos,
        metadata: {
            totalRecords: count,
            hasMore,
            page,
            limit
        }
    });
  } catch (error) {
    console.error('Supplier Purchases API Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch supplier purchases', error: String(error) },
      { status: 500 }
    );
  }
}
