import { getCategories, getProducts } from "@/lib/data/products";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "12");
        const search = searchParams.get("search") || "";
        const categoryId = searchParams.get("categoryId") || undefined;

        // Use parallel fetching with cached data layer functions
        const [productsResult, categories] = await Promise.all([
            getProducts({ page, limit, search, categoryId }),
            getCategories()
        ]);

        return NextResponse.json({
            data: productsResult.data,
            categories,
            meta: productsResult.meta
        });
    } catch (error) {
        console.error("Product API Error:", error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
