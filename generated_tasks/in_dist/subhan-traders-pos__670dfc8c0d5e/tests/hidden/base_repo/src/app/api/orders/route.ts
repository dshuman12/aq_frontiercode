import { getOrders, getPaginatedOrders } from '@/lib/data/orders';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const pageParam = searchParams.get('page');
    
    // If no page parameter is provided, we default to the legacy behavior 
    // to avoid breaking dashboard and reports, though we could just pass default page 1 and let it run.
    // However, Dashboard expects a flat array of orders, not `{ data, metadata }`.
    // We check if `page` is present, meaning the frontend explicitly requested pagination.
    if (pageParam !== null) {
      const page = parseInt(pageParam) || 1;
      const limit = parseInt(searchParams.get('limit') || '20');
      const search = searchParams.get('search') || undefined;
      const from = searchParams.get('from') || undefined;
      const to = searchParams.get('to') || undefined;
      
      const paginatedOrders = await getPaginatedOrders({ search, from, to, page, limit });
      return NextResponse.json(paginatedOrders);
    }
    
    // Legacy support (returns all orders)
    const allOrders = await getOrders();
    return NextResponse.json(allOrders);
  } catch (error) {
    console.error('Orders API Error:', error);
    return NextResponse.json({ message: 'Failed to fetch orders' }, { status: 500 });
  }
}
