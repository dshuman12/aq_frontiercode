import { db } from '@/db';
import { purchaseOrders } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const allPurchases = await db.query.purchaseOrders.findMany({
      with: {
        supplier: true,
        items: true,
        payments: true
      },
      orderBy: [desc(purchaseOrders.purchaseDate)]
    });
    return NextResponse.json(allPurchases);
  } catch (error) {
    console.error('Purchases API Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch purchases', error: String(error) },
      { status: 500 }
    );
  }
}
