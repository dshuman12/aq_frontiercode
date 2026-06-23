'use server';

import { db } from "@/db";
import { items, purchaseOrderItems, purchaseOrders, supplierPayments, suppliers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const SupplierSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(1, "Phone is required"),
    address: z.string().optional(),
});

const SupplierPaymentSchema = z.object({
    supplierId: z.string().min(1, "Supplier ID is required"),
    purchaseOrderId: z.string().min(1, "Purchase Order ID is required"),
    amount: z.number().positive("Amount must be positive"),
    paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE_PAYMENT']),
    notes: z.string().optional(),
});

export async function createSupplier(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = SupplierSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { error: "Invalid fields" };
    }

    try {
        await db.insert(suppliers).values({
            ...validatedFields.data,
            isActive: true
        });
        revalidateTag('suppliers', 'max');
        return { success: true };
    } catch (error: any) {
        if (error.code === '23505') {
            return { error: "Supplier with this name already exists" };
        }
        return { error: "Failed to create supplier" };
    }
}

export async function deleteSupplier(id: string) {
    try {
        await db.delete(suppliers).where(eq(suppliers.id, id));
        revalidateTag('suppliers', 'max');
        return { success: true };
    } catch (error) {
        return { error: "Failed to delete supplier" };
    }
}

export async function updateSupplier(id: string, data: {
    name?: string;
    phone?: string;
    address?: string;
}) {
    try {
        await db.update(suppliers)
            .set(data)
            .where(eq(suppliers.id, id));
        revalidateTag('suppliers', 'max');
        return { success: true };
    } catch (error: any) {
        if (error.code === '23505') {
            return { error: "Supplier with this name already exists" };
        }
        return { error: "Failed to update supplier" };
    }
}

/**
 * Record a payment against a specific purchase order.
 * Updates PO paid/remaining, and supplier-level totals.
 */
export async function recordSupplierPayment(data: {
    supplierId: string;
    purchaseOrderId: string;
    amount: number;
    paymentMethod: 'CASH' | 'CARD' | 'ONLINE_PAYMENT';
    notes?: string;
}) {
    const validatedFields = SupplierPaymentSchema.safeParse(data);

    if (!validatedFields.success) {
        return { error: "Invalid payment data" };
    }

    const { supplierId, purchaseOrderId, amount, paymentMethod, notes } = validatedFields.data;

    try {
        await db.transaction(async (tx) => {
            // 1. Get current PO to check remaining
            const [po] = await tx.select({
                remainingAmount: purchaseOrders.remainingAmount,
            }).from(purchaseOrders).where(eq(purchaseOrders.id, purchaseOrderId));

            if (!po) throw new Error("Purchase order not found");

            const currentRemaining = parseFloat(po.remainingAmount);
            if (amount > currentRemaining) {
                throw new Error("Amount exceeds remaining balance");
            }

            // 2. Create payment record linked to PO
            await tx.insert(supplierPayments).values({
                supplierId,
                purchaseOrderId,
                amount: amount.toString(),
                paymentMethod,
                notes,
                paymentDate: new Date(),
            });

            // 3. Update PO balances
            await tx.update(purchaseOrders)
                .set({
                    paidAmount: sql`${purchaseOrders.paidAmount} + ${amount}`,
                    remainingAmount: sql`${purchaseOrders.remainingAmount} - ${amount}`,
                })
                .where(eq(purchaseOrders.id, purchaseOrderId));

            // 4. Update supplier balance
            await tx.update(suppliers)
                .set({
                    amountPaid: sql`${suppliers.amountPaid} + ${amount}`,
                    remainingAmount: sql`${suppliers.remainingAmount} - ${amount}`
                })
                .where(eq(suppliers.id, supplierId));
        });

        revalidateTag('suppliers', 'max');
        revalidateTag('purchases', 'max');
        return { success: true };
    } catch (error: any) {
        console.error("Supplier Payment Error:", error);
        return { error: error.message || "Failed to record payment" };
    }
}

/**
 * Delete a purchase order. Reverses stock and supplier balance.
 */
export async function deletePurchaseOrder(purchaseOrderId: string) {
    try {
        await db.transaction(async (tx) => {
            // 1. Get the PO with items
            const po = await tx.query.purchaseOrders.findFirst({
                where: eq(purchaseOrders.id, purchaseOrderId),
                with: { items: true },
            });

            if (!po) throw new Error("Purchase order not found");

            // 2. Reverse stock for each item
            for (const item of po.items) {
                if (item.itemId) {
                    await tx.update(items)
                        .set({
                            quantity: sql`GREATEST(${items.quantity} - ${item.quantity}, 0)`,
                        })
                        .where(eq(items.id, item.itemId));
                }
            }

            // 3. Adjust supplier balance (subtract total, add back remaining as unpaid adjustment)
            const poTotal = parseFloat(po.totalAmount);
            const poPaid = parseFloat(po.paidAmount);

            await tx.update(suppliers)
                .set({
                    totalAmount: sql`${suppliers.totalAmount} - ${poTotal}`,
                    amountPaid: sql`${suppliers.amountPaid} - ${poPaid}`,
                    remainingAmount: sql`${suppliers.remainingAmount} - (${poTotal} - ${poPaid})`,
                })
                .where(eq(suppliers.id, po.supplierId));

            // 4. Delete the PO (cascades to items and payments)
            await tx.delete(purchaseOrders).where(eq(purchaseOrders.id, purchaseOrderId));
        });

        revalidateTag('suppliers', 'max');
        revalidateTag('purchases', 'max');
        revalidateTag('products', 'max');
        revalidateTag('dashboard', 'max');
        return { success: true };
    } catch (error: any) {
        console.error("Delete PO Error:", error);
        return { error: error.message || "Failed to delete purchase order" };
    }
}

/**
 * Update a purchase order: notes, items (qty/price changes).
 * Recalculates totals and adjusts supplier balance.
 */
export async function updatePurchaseOrder(purchaseOrderId: string, data: {
    notes?: string;
    purchaseDate?: string;
    items: Array<{
        id: string;
        quantity: number;
        purchasePrice: number;
    }>;
}) {
    try {
        await db.transaction(async (tx) => {
            // 1. Get current PO with items
            const po = await tx.query.purchaseOrders.findFirst({
                where: eq(purchaseOrders.id, purchaseOrderId),
                with: { items: true },
            });

            if (!po) throw new Error("Purchase order not found");

            const oldTotal = parseFloat(po.totalAmount);
            const paidAmount = parseFloat(po.paidAmount);

            // 2. Update each item and adjust stock
            let newTotal = 0;
            for (const updatedItem of data.items) {
                const existingItem = po.items.find(i => i.id === updatedItem.id);
                if (!existingItem) continue;

                const oldQty = existingItem.quantity;
                const newQty = updatedItem.quantity;
                const qtyDiff = newQty - oldQty;
                const newItemTotal = newQty * updatedItem.purchasePrice;

                // Update PO item
                await tx.update(purchaseOrderItems)
                    .set({
                        quantity: newQty,
                        purchasePrice: updatedItem.purchasePrice.toString(),
                        itemTotal: newItemTotal.toString(),
                    })
                    .where(eq(purchaseOrderItems.id, updatedItem.id));

                // Adjust stock if qty changed
                if (qtyDiff !== 0 && existingItem.itemId) {
                    await tx.update(items)
                        .set({
                            quantity: sql`GREATEST(${items.quantity} + ${qtyDiff}, 0)`,
                            costPrice: updatedItem.purchasePrice.toString(),
                        })
                        .where(eq(items.id, existingItem.itemId));
                }

                newTotal += newItemTotal;
            }

            // 3. Update PO totals
            const newRemaining = Math.max(newTotal - paidAmount, 0);
            
            const updateData: Record<string, any> = {
                totalAmount: newTotal.toString(),
                remainingAmount: newRemaining.toString(),
            };
            if (data.notes !== undefined) updateData.notes = data.notes;
            if (data.purchaseDate) updateData.purchaseDate = new Date(data.purchaseDate);

            await tx.update(purchaseOrders)
                .set(updateData)
                .where(eq(purchaseOrders.id, purchaseOrderId));

            // 4. Adjust supplier balance
            const totalDiff = newTotal - oldTotal;
            const remainingDiff = newRemaining - parseFloat(po.remainingAmount);

            if (totalDiff !== 0 || remainingDiff !== 0) {
                await tx.update(suppliers)
                    .set({
                        totalAmount: sql`${suppliers.totalAmount} + ${totalDiff}`,
                        remainingAmount: sql`${suppliers.remainingAmount} + ${remainingDiff}`,
                    })
                    .where(eq(suppliers.id, po.supplierId));
            }
        });

        revalidateTag('suppliers', 'max');
        revalidateTag('purchases', 'max');
        revalidateTag('products', 'max');
        return { success: true };
    } catch (error: any) {
        console.error("Update PO Error:", error);
        return { error: error.message || "Failed to update purchase order" };
    }
}
