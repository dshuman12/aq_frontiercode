import { db } from '@/db';
import { purchaseOrders, supplierPayments, suppliers } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Fetch supplier
    const supplier = await db.query.suppliers.findFirst({
      where: eq(suppliers.id, id)
    });

    if (!supplier) {
      return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Supplier Detail API Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch supplier', error: String(error) },
      { status: 500 }
    );
  }
}
