'use server';

import { db } from "@/db";
import { items, orderItems, orders } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const OrderSchema = z.object({
    customerId: z.string().nullable(),
    totalAmount: z.number().min(0),
    discount: z.number().min(0).default(0),
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().min(1),
        price: z.number().min(0)
    }))
});

export async function createOrder(data: any) {
    const validatedData = OrderSchema.safeParse(data);

    if (!validatedData.success) {
        return { error: "Invalid order data" };
    }

    const { customerId, totalAmount, discount, items: cartItems } = validatedData.data;

    try {
        await db.transaction(async (tx) => {
            // 1. Create Order
            // Generate a simple Invoice ID (e.g., INV-YYYYMMDD-XXXX)
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const invoiceId = `INV-${dateStr}-${randomSuffix}`;
            
            // Calculate numeric values safely
            const numTotalAmount = Number(totalAmount);
            const numDiscount = Number(discount);
            const numSubtotal = numTotalAmount + numDiscount; // Assuming totalAmount passed from frontend is the final price (after discount)
            // OR if frontend passes subtotal and discount, adjust logic. 
            // Assuming frontend passes 'totalAmount' as the final payable magnitude, and 'discount' as the reduction.
            // Let's assume:
            // totalAmount = Final Price to Pay
            // discount = Discount Given
            // subtotal = totalAmount + discount
            
            // Wait, usually POS sends Cart Total (Subtotal) and Discount?
            // Let's check Schema: totalPrice, totalDiscount, subtotal.
            // Let's assume input 'totalAmount' IS 'totalPrice' (Net).
            
            const [newOrder] = await tx.insert(orders).values({
                invoiceId: invoiceId,
                customerId: customerId === 'walk-in' ? null : customerId,
                subtotal: (numTotalAmount + numDiscount).toString(),
                totalDiscount: numDiscount.toString(),
                totalPrice: numTotalAmount.toString(),
                paidAmount: "0",
                outstandingAmount: numTotalAmount.toString(),
                orderStatus: 'PENDING',
                paymentMethod: 'CASH', // Default
                totalProfit: "0", // Will update after calculating items
            }).returning();

            // 2. Batch fetch all products in a single query (eliminates N+1)
            const productIds = cartItems.map(item => item.productId);
            const products = await tx.select().from(items).where(inArray(items.id, productIds));
            const productMap = new Map(products.map(p => [p.id, p]));

            let orderTotalProfit = 0;

            // 3. Validate stock and prepare order items
            for (const item of cartItems) {
                const product = productMap.get(item.productId);
                
                if (!product || product.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for: ${product?.productName || item.productId}`);
                }

                const quantity = Number(item.quantity);
                const price = Number(item.price); // Retail Price
                const cost = Number(product.costPrice) || 0;
                
                const itemTotal = quantity * price;
                const itemProfit = quantity * (price - cost);
                orderTotalProfit += itemProfit;

                // Add Order Item
                await tx.insert(orderItems).values({
                    orderId: newOrder.id,
                    itemId: item.productId,
                    quantity: quantity,
                    appliedPrice: price.toString(),
                    productNameSnapshot: product.productName,
                    itemTotal: itemTotal.toString(),
                    itemProfit: itemProfit.toString(),
                    priceType: 'RETAIL', // Default
                    costPriceSnapshot: cost.toString(),
                });

                // Decrement Stock
                await tx.update(items)
                    .set({ quantity: sql`${items.quantity} - ${quantity}` })
                    .where(eq(items.id, item.productId));
            }

            // Update Order Total Profit
             await tx.update(orders)
                .set({ totalProfit: orderTotalProfit.toString() })
                .where(eq(orders.id, newOrder.id));

        });

        revalidateTag('orders', 'max');
        revalidateTag('products', 'max');
        revalidateTag('dashboard', 'max');
        return { success: true };

    } catch (error: any) {
        console.error("Order Creation Error:", error);
        return { error: error.message || "Failed to process order" };
    }
}

export async function cancelOrder(orderId: string) {
    try {
        await db.transaction(async (tx) => {
             // 1. Fetch Order Items to restore stock
             const existingOrderItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
 
             // 2. Restore Stock
             for (const item of existingOrderItems) {
                 if (item.itemId) {
                     await tx.update(items)
                         .set({ quantity: sql`${items.quantity} + ${item.quantity}` })
                         .where(eq(items.id, item.itemId));
                 }
             }
 
             // 3. Mark Order as Cancelled
             await tx.update(orders)
                 .set({ 
                     orderStatus: 'CANCELLED',
                     isArchived: true // Optional: hide from main list if needed, or just keep as cancelled
                 })
                 .where(eq(orders.id, orderId));
        });
 
        revalidateTag('orders', 'max');
        revalidateTag('products', 'max');
        revalidateTag('dashboard', 'max');
        return { success: true };
    } catch (error: any) {
         console.error("Order Cancellation Error:", error);
         return { error: error.message || "Failed to cancel order" };
    }
 }

 const UpdateOrderSchema = z.object({
    orderId: z.string(),
    totalAmount: z.number().min(0),
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().min(1),
        price: z.number().min(0),
        discount: z.number().min(0).default(0)
    }))
});

export async function updateOrder(data: any) {
    const validatedData = UpdateOrderSchema.safeParse(data);

    if (!validatedData.success) {
        return { error: "Invalid update data" };
    }

    const { orderId, totalAmount, items: newCartItems } = validatedData.data;

    try {
        await db.transaction(async (tx) => {
             // 1. Fetch Existing Order Items
             const existingItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
             
             // Map for easy lookup: itemId -> quantity
             const oldItemMap = new Map<string, number>();
             existingItems.forEach(i => {
                if (i.itemId) oldItemMap.set(i.itemId, i.quantity);
             });

             // 2. Batch fetch all products needed (eliminates N+1)
             const allProductIds = [
               ...newCartItems.map(item => item.productId),
               ...Array.from(oldItemMap.keys())
             ];
             const uniqueProductIds = [...new Set(allProductIds)];
             const products = await tx.select().from(items).where(inArray(items.id, uniqueProductIds));
             const productMap = new Map(products.map(p => [p.id, p]));

             let orderTotalProfit = 0;

             // 3. Process Stock Adjustments
             for (const newItem of newCartItems) {
                const oldQty = oldItemMap.get(newItem.productId);
                const product = productMap.get(newItem.productId);
                
                if (oldQty !== undefined) {
                    // Item existed, calculate diff
                    const diff = newItem.quantity - oldQty;
                    
                    if (diff > 0) {
                        // Increased quantity: Deduct Stock
                        if (!product || product.quantity < diff) {
                             throw new Error(`Insufficient stock to increase quantity for: ${product?.productName}`);
                        }
                        await tx.update(items)
                            .set({ quantity: sql`${items.quantity} - ${diff}` })
                            .where(eq(items.id, newItem.productId));

                    } else if (diff < 0) {
                        // Decreased quantity: Restore Stock
                        await tx.update(items)
                            .set({ quantity: sql`${items.quantity} + ${Math.abs(diff)}` })
                            .where(eq(items.id, newItem.productId));
                    }

                    // Remove from map to track deletions later
                    oldItemMap.delete(newItem.productId);

                } else {
                    // New Item Added: Deduct Full Stock
                    if (!product || product.quantity < newItem.quantity) {
                         throw new Error(`Insufficient stock for new item: ${product?.productName}`);
                    }
                    await tx.update(items)
                        .set({ quantity: sql`${items.quantity} - ${newItem.quantity}` })
                        .where(eq(items.id, newItem.productId));
                }
             }

             // 4. Handle Deleted Items (Remaining in oldItemMap)
             for (const [itemId, qty] of oldItemMap.entries()) {
                 // Restore stock for deleted items
                 await tx.update(items)
                    .set({ quantity: sql`${items.quantity} + ${qty}` })
                    .where(eq(items.id, itemId));
             }

             // 5. Delete Old Order Items
             await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));

             // 6. Insert New Order Items (uses pre-fetched product data)
             for (const item of newCartItems) {
                const product = productMap.get(item.productId)!;
                
                const quantity = Number(item.quantity);
                const price = Number(item.price);
                const discount = Number(item.discount || 0);
                const cost = Number(product.costPrice) || 0;
                
                const itemTotal = quantity * price - discount;
                const itemProfit = itemTotal - (quantity * cost);
                orderTotalProfit += itemProfit;

                await tx.insert(orderItems).values({
                    orderId: orderId,
                    itemId: item.productId,
                    quantity: quantity,
                    appliedPrice: price.toString(),
                    productNameSnapshot: product.productName,
                    itemTotal: itemTotal.toString(),
                    itemProfit: itemProfit.toString(),
                    priceType: 'RETAIL',
                    discountAmount: discount.toString(),
                    costPriceSnapshot: cost.toString(),
                });
             }

             // 7. Update Order Totals (merged into single query with SQL expression for outstanding)
             const numTotalAmount = Number(totalAmount);
             const numDiscount = newCartItems.reduce((acc, item) => acc + Number(item.discount || 0), 0);
             
             await tx.update(orders)
                .set({
                    subtotal: (numTotalAmount + numDiscount).toString(),
                    totalDiscount: numDiscount.toString(),
                    totalPrice: numTotalAmount.toString(),
                    outstandingAmount: sql`${numTotalAmount} - ${orders.paidAmount}`,
                    totalProfit: orderTotalProfit.toString()
                })
                .where(eq(orders.id, orderId));

        });

        revalidateTag('orders', 'max');
        revalidateTag('products', 'max');
        revalidateTag('dashboard', 'max');
        return { success: true };

    } catch (error: any) {
        console.error("Order Update Error:", error);
        return { error: error.message || "Failed to update order" };
    }
}
