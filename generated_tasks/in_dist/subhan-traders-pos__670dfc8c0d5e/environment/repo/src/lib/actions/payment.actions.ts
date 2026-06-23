'use server';

import { db } from "@/db";
import { customers, orders, payments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const PaymentSchema = z.object({
    orderId: z.string().min(1),
    amount: z.number().min(1),
    method: z.enum(["CASH", "CARD", "ONLINE_PAYMENT"]).default("CASH"),
    notes: z.string().optional()
});

export async function addOrderPayment(data: any) {
    const validated = PaymentSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid payment data" };

    const { orderId, amount, method, notes } = validated.data;

    try {
        await db.transaction(async (tx) => {
            // 1. Fetch current order
             const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
             if (!order) throw new Error("Order not found");

             const newPaidAmount = Number(order.paidAmount) + amount;
             const newOutstanding = Number(order.totalPrice) - newPaidAmount;
             
             // 2. Create Payment Record
             await tx.insert(payments).values({
                 orderId,
                 amount: amount.toString(),
                 paymentMethod: method,
                 notes
             });

             // 3. Update Order
             await tx.update(orders).set({
                 paidAmount: newPaidAmount.toString(),
                 outstandingAmount: (Math.max(0, newOutstanding)).toString(),
                 orderStatus: newOutstanding <= 0 ? "FULLY_PAID" : "PARTIALLY_PAID" 
             }).where(eq(orders.id, orderId));

             // 4. Update Customer Balance if linked
             if (order.customerId) {
                 await tx.update(customers)
                    .set({
                        paidAmount: sql`${customers.paidAmount} + ${amount}`,
                        outstandingAmount: sql`${customers.outstandingAmount} - ${amount}`
                    })
                    .where(eq(customers.id, order.customerId));
             }
        });

        revalidateTag('orders', 'max');
        revalidateTag('customers', 'max');
        revalidateTag('dashboard', 'max');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { error: "Failed to record payment" };
    }
}
