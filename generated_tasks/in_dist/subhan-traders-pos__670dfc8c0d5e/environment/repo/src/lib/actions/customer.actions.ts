'use server';

import { db } from "@/db";
import { customers, orders, payments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const CustomerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(10, "Phone number is required"),
    cnic: z.string().optional(),
    address: z.string().optional(),
});

const CustomerPaymentSchema = z.object({
    customerId: z.string().min(1, "Customer ID is required"),
    orderId: z.string().min(1, "Order ID is required"),
    amount: z.number().positive("Amount must be positive"),
    paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE_PAYMENT']),
    notes: z.string().optional(),
});

export async function createCustomer(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    
    // Cleanup empty strings
    if (rawData.cnic === "") delete rawData.cnic;
    if (rawData.address === "") delete rawData.address;

    const validatedFields = CustomerSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { error: "Invalid fields" };
    }

    try {
        await db.insert(customers).values({
            ...validatedFields.data,
            isActive: true
        });
        revalidateTag('customers', 'max');
        revalidateTag('dashboard', 'max');
        return { success: true };
    } catch (error: any) {
        if (error.code === '23505') {
            return { error: "Customer with this Phone or CNIC already exists" };
        }
        return { error: "Failed to create customer" };
    }
}

export async function updateCustomer(id: string, data: {
    name?: string;
    phone?: string;
    cnic?: string;
    address?: string;
}) {
    try {
        // Clean empty strings → null for nullable unique fields
        const cleanData: Record<string, any> = { ...data };
        if (cleanData.cnic === "") cleanData.cnic = null;
        if (cleanData.address === "") cleanData.address = null;

        await db.update(customers)
            .set(cleanData)
            .where(eq(customers.id, id));
        revalidateTag('customers', 'max');
        return { success: true };
    } catch (error: any) {
        if (error.code === '23505') {
            return { error: "Customer with this Phone or CNIC already exists" };
        }
        return { error: "Failed to update customer" };
    }
}

export async function deleteCustomer(id: string) {
    try {
        // Soft-deactivate to preserve order history
        await db.update(customers)
            .set({ isActive: false })
            .where(eq(customers.id, id));
        revalidateTag('customers', 'max');
        revalidateTag('dashboard', 'max');
        return { success: true };
    } catch (error) {
        return { error: "Failed to deactivate customer" };
    }
}

export async function recordCustomerPayment(data: {
    customerId: string;
    orderId: string;
    amount: number;
    paymentMethod: 'CASH' | 'CARD' | 'ONLINE_PAYMENT';
    notes?: string;
}) {
    const validatedFields = CustomerPaymentSchema.safeParse(data);

    if (!validatedFields.success) {
        return { error: "Invalid payment data" };
    }

    const { customerId, orderId, amount, paymentMethod, notes } = validatedFields.data;

    try {
        await db.transaction(async (tx) => {
            // 1. Get current order to check outstanding
            const [order] = await tx.select({
                outstandingAmount: orders.outstandingAmount,
                totalPrice: orders.totalPrice,
            }).from(orders).where(eq(orders.id, orderId));

            if (!order) throw new Error("Order not found");

            const currentOutstanding = parseFloat(order.outstandingAmount);
            if (amount > currentOutstanding) {
                throw new Error("Amount exceeds outstanding balance");
            }

            const newOutstanding = currentOutstanding - amount;
            const newOrderStatus = newOutstanding <= 0 ? 'FULLY_PAID' : 'PARTIALLY_PAID';

            // 2. Insert payment record
            await tx.insert(payments).values({
                orderId,
                amount: amount.toString(),
                paymentMethod,
                notes,
                paymentDate: new Date(),
            });

            // 3. Update order balances + status
            await tx.update(orders)
                .set({
                    paidAmount: sql`${orders.paidAmount} + ${amount}`,
                    outstandingAmount: sql`${orders.outstandingAmount} - ${amount}`,
                    orderStatus: newOrderStatus,
                })
                .where(eq(orders.id, orderId));

            // 4. Update customer balances
            await tx.update(customers)
                .set({
                    paidAmount: sql`${customers.paidAmount} + ${amount}`,
                    outstandingAmount: sql`${customers.outstandingAmount} - ${amount}`,
                })
                .where(eq(customers.id, customerId));
        });

        revalidateTag('customers', 'max');
        revalidateTag('orders', 'max');
        revalidateTag('dashboard', 'max');
        return { success: true };
    } catch (error: any) {
        console.error("Customer Payment Error:", error);
        return { error: error.message || "Failed to record payment" };
    }
}
