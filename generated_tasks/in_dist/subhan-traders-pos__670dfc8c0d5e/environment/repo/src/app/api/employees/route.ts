import { db } from '@/db';
import { employees } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const allEmployees = await db.select().from(employees);
    return NextResponse.json(allEmployees);
  } catch (error) {
    console.error('Employees API Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch employees', error: String(error) },
      { status: 500 }
    );
  }
}
