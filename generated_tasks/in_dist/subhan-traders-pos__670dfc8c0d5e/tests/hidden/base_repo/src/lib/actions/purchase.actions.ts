'use server';

import { db } from "@/db";
import { items, purchaseOrderItems, purchaseOrders, suppliers, supplierPayments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const PurchaseOrderSchema = z.object({
    supplierId: z.string().min(1, "Supplier is required"),
    totalAmount: z.number().min(0),
    paidAmount: z.number().min(0),
    paymentMethod: z.enum(["CASH", "CARD", "ONLINE_PAYMENT"]).optional().default("CASH"),
    items: z.array(z.object({
        itemId: z.string().min(1),
        productName: z.string(), // Snapshot
        quantity: z.number().min(1),
        costPrice: z.number().min(0)
    })).min(1, "At least one item is required")
});

export async function createPurchaseOrder(data: any) {
    const validatedData = PurchaseOrderSchema.safeParse(data);

    if (!validatedData.success) {
        return { error: "Invalid purchase data" };
    }

    const { supplierId, totalAmount, paidAmount, paymentMethod, items: poItems } = validatedData.data;
    const remainingAmount = totalAmount - paidAmount;

    try {
        await db.transaction(async (tx) => {
            // 1. Create Purchase Order
            const [newPO] = await tx.insert(purchaseOrders).values({
                supplierId,
                totalAmount: totalAmount.toString(),
                paidAmount: paidAmount.toString(),
                remainingAmount: remainingAmount.toString(),
                purchaseDate: new Date(),
            }).returning();

            // 2. Create PO Items and Update Stock
            for (const item of poItems) {
                await tx.insert(purchaseOrderItems).values({
                    purchaseOrderId: newPO.id,
                    itemId: item.itemId,
                    productNameSnapshot: item.productName,
                    quantity: item.quantity,
                    purchasePrice: item.costPrice.toString(),
                    itemTotal: (item.quantity * item.costPrice).toString(),
                });

                // Update Stock & Average Cost (Simple Moving Average or just Last Cost? Let's just update Cost Price to latest for now)
                await tx.update(items)
                    .set({ 
                        quantity: sql`${items.quantity} + ${item.quantity}`,
                        costPrice: item.costPrice.toString() 
                    })
                    .where(eq(items.id, item.itemId));
            }

            // 3. Update Supplier Balance
            await tx.update(suppliers)
                .set({
                    totalAmount: sql`${suppliers.totalAmount} + ${totalAmount}`,
                    amountPaid: sql`${suppliers.amountPaid} + ${paidAmount}`,
                    remainingAmount: sql`${suppliers.remainingAmount} + ${remainingAmount}`
                })
                .where(eq(suppliers.id, supplierId));

            // 4. Record Initial Payment to Supplier if any
            if (paidAmount > 0) {
                await tx.insert(supplierPayments).values({
                    supplierId,
                    purchaseOrderId: newPO.id,
                    amount: paidAmount.toString(),
                    paymentMethod: paymentMethod,
                    notes: "Initial payment at purchase",
                });
            }

        });

        revalidateTag('purchases', 'max');
        revalidateTag('products', 'max');
        revalidateTag('suppliers', 'max');
        revalidateTag('dashboard', 'max');
        return { success: true };

    } catch (error) {
        console.error("Purchase Order Error:", error);
        return { error: "Failed to create purchase order" };
    }
}
