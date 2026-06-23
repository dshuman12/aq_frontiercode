'use server';

import { db } from "@/db";
import { items, stockAdjustments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const AdjustmentSchema = z.object({
    itemId: z.string().min(1),
    quantityChange: z.coerce.number(), // Can be negative or positive
    reason: z.string().min(1, "Reason is required"),
});

export async function adjustStock(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = AdjustmentSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { error: "Invalid fields" };
    }

    const { itemId, quantityChange, reason } = validatedFields.data;

    try {
        await db.transaction(async (tx) => {
            // 1. Create Adjustment Record
            await tx.insert(stockAdjustments).values({
                itemId,
                quantityChange,
                reason,
            });

            // 2. Update Item Quantity
            await tx.update(items)
                .set({ quantity: sql`${items.quantity} + ${quantityChange}` }) // Adding change (if negative, it subtracts)
                .where(eq(items.id, itemId));
        });

        revalidateTag('products', 'max');
        revalidateTag('dashboard', 'max');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { error: "Failed to adjust stock" };
    }
}
