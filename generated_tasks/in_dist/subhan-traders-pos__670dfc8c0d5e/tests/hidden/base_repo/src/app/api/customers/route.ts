import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    try {
        let whereClause = eq(customers.isActive, true);
        
        if (query) {
            const lowerQuery = `%${query}%`;
            whereClause = or(
                ilike(customers.name, lowerQuery),
                ilike(customers.phone, lowerQuery),
                ilike(customers.cnic, lowerQuery)
            ) as any;
        }

        const res = await db.select().from(customers).where(whereClause).limit(20);
        return NextResponse.json(res);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }
}
