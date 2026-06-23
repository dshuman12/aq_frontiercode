'use server';

import { db } from "@/db";
import { counters, customers, items, orderItems, orders, payments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";

interface CartItemInput {
  itemId: string;
  productName: string;
  categoryName: string | null;
  quantity: number;
  appliedPrice: number;
  costPrice: number | null;
  discount: number;
  priceType: "RETAIL" | "WHOLESALE";
}

interface CreateSaleInput {
  items: CartItemInput[];
  customerId: string | null;
  walkInCustomer: {
    name: string;
    phone: string;
    cnic: string;
  } | null;
  isWholesale: boolean;
  paymentMethod: "CASH" | "CARD" | "ONLINE_PAYMENT";
  amountPaid: number;
  subtotal: number;
  totalDiscount: number;
  total: number;
  totalProfit: number;
}

export async function createSale(input: CreateSaleInput) {
  try {
    // Use transaction for atomic operations
    const result = await db.transaction(async (tx) => {
      // Generate invoice ID atomically (inlined)
      const counterId = "invoice_counter";
      const existing = await tx
        .select()
        .from(counters)
        .where(eq(counters.id, counterId));
      
      let newValue: number;
      if (existing.length === 0) {
        await tx.insert(counters).values({
          id: counterId,
          sequenceValue: 1,
        });
        newValue = 1;
      } else {
        newValue = existing[0].sequenceValue + 1;
        await tx
          .update(counters)
          .set({ sequenceValue: newValue })
          .where(eq(counters.id, counterId));
      }
      
      const invoiceId = `INV-${String(newValue).padStart(5, "0")}`;
      

      // Calculate outstanding
      const outstanding = Math.max(0, input.total - input.amountPaid);
      
      // Determine order status
      let orderStatus: "PENDING" | "PARTIALLY_PAID" | "FULLY_PAID" = "PENDING";
      if (input.amountPaid >= input.total) {
        orderStatus = "FULLY_PAID";
      } else if (input.amountPaid > 0) {
        orderStatus = "PARTIALLY_PAID";
      }
      
      // 1. Create the order
      const [order] = await tx.insert(orders).values({
        invoiceId,
        customerId: input.customerId,
        walkInCustomerName: input.walkInCustomer?.name,
        walkInCustomerPhone: input.walkInCustomer?.phone,
        walkInCustomerCNIC: input.walkInCustomer?.cnic,
        subtotal: String(input.subtotal),
        totalDiscount: String(input.totalDiscount),
        totalPrice: String(input.total),
        totalProfit: String(input.totalProfit),
        paidAmount: String(input.amountPaid),
        outstandingAmount: String(outstanding),
        isWholesale: input.isWholesale,
        paymentMethod: input.paymentMethod,
        orderStatus,
      }).returning();
      
      // 2. Create order items and update stock atomically
      for (const item of input.items) {
        const itemTotal = item.appliedPrice * item.quantity - item.discount;
        const itemProfit = ((item.appliedPrice - (item.costPrice || 0)) * item.quantity) - item.discount;
        
        // Insert order item
        await tx.insert(orderItems).values({
          orderId: order.id,
          itemId: item.itemId,
          productNameSnapshot: item.productName,
          productCategorySnapshot: item.categoryName,
          quantity: item.quantity,
          priceType: item.priceType,
          appliedPrice: String(item.appliedPrice),
          costPriceSnapshot: String(item.costPrice || 0),
          discountAmount: String(item.discount),
          itemTotal: String(itemTotal),
          itemProfit: String(itemProfit),
        });
        
        // Update stock atomically
        await tx
          .update(items)
          .set({
            quantity: sql`${items.quantity} - ${item.quantity}`,
          })
          .where(eq(items.id, item.itemId));
      }
      
      // 3. Record initial payment if any
      if (input.amountPaid > 0) {
        await tx.insert(payments).values({
          orderId: order.id,
          amount: String(input.amountPaid),
          paymentMethod: input.paymentMethod,
          notes: "Initial payment at sale",
        });
      }
      
      // 4. Update customer balance atomically if registered customer
      if (input.customerId) {
        await tx
          .update(customers)
          .set({
            paidAmount: sql`${customers.paidAmount} + ${input.amountPaid}`,
            outstandingAmount: sql`${customers.outstandingAmount} + ${outstanding}`,
          })
          .where(eq(customers.id, input.customerId));
      }
      
      return { order, invoiceId };
    });
    
    revalidateTag('orders', 'max');
    revalidateTag('products', 'max');
    revalidateTag('customers', 'max');
    revalidateTag('dashboard', 'max');
    
    return { success: true, order: result.order, invoiceId: result.invoiceId };
  } catch (error) {
    console.error("Failed to create sale:", error);
    return { success: false, error: "Failed to create sale" };
  }
}

// Get products for POS search
export async function searchProducts(query: string, offset = 0, limit = 12) {
  try {
    const results = await db.query.items.findMany({
      where: (items, { or, ilike, eq: eqOp }) =>
        query
          ? or(
              ilike(items.productName, `%${query}%`),
              eqOp(items.barcode, query),
              ilike(items.sku, `%${query}%`)
            )
          : undefined,
      with: {
        category: true,
      },
      limit: limit + 1, // fetch one extra to detect hasMore
      offset,
    });

    const hasMore = results.length > limit;
    const products = results.slice(0, limit).filter(p => p.isActive && p.quantity > 0);

    return { products, hasMore };
  } catch (error) {
    console.error("Failed to search products:", error);
    return { products: [], hasMore: false };
  }
}

// Get customers for POS customer selector
export async function searchCustomers(query: string) {
  try {
    const result = await db.query.customers.findMany({
      where: (customers, { or, ilike }) =>
        query
          ? or(
              ilike(customers.name, `%${query}%`),
              ilike(customers.phone, `%${query}%`)
            )
          : undefined,
      limit: 50,
    });
    
    return result.filter(c => c.isActive);
  } catch (error) {
    console.error("Failed to search customers:", error);
    return [];
  }
}
