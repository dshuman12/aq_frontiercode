import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const allSuppliers = await db.select().from(suppliers);
    return NextResponse.json(allSuppliers);
  } catch (error) {
    console.error('Suppliers API Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch suppliers', error: String(error) },
      { status: 500 }
    );
  }
}
