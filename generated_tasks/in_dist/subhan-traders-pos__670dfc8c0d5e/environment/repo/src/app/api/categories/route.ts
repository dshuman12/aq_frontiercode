import { db } from '@/db';
import { categories } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const allCategories = await db.select().from(categories);
    return NextResponse.json(allCategories);
  } catch (error) {
    console.error('Categories API Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch categories', error: String(error) },
      { status: 500 }
    );
  }
}
