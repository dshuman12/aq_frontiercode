'use server';

import { db } from "@/db";
import { items } from "@/db/schema";
import { ProductSchema } from "@/lib/validations/product";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";

export async function createProduct(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  
  // Handle empty optional fields
  if (rawData.wholesalePrice === "") delete rawData.wholesalePrice;
  if (rawData.costPrice === "") delete rawData.costPrice;
  if (rawData.sku === "") delete rawData.sku;
  if (rawData.barcode === "") delete rawData.barcode;
  if (rawData.imgUrl === "") delete rawData.imgUrl;

  const validatedFields = ProductSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: "Invalid fields", issues: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await db.insert(items).values({
      ...validatedFields.data,
      wholesalePrice: validatedFields.data.wholesalePrice ? validatedFields.data.wholesalePrice.toString() : null,
      costPrice: validatedFields.data.costPrice ? validatedFields.data.costPrice.toString() : null,
      retailPrice: validatedFields.data.retailPrice.toString(),
      imgUrl: validatedFields.data.imgUrl || null,
      isActive: true
    });
    
    revalidateTag('products', 'max');
    revalidateTag('dashboard', 'max');
    return { success: true };
  } catch (error: any) {
    console.error("Create Product Error:", error);
    if (error.code === '23505') { // Unique constraint violation
         return { error: "Product with this Name, SKU or Barcode already exists" };
    }
    return { error: "Failed to create product" };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  
  // Handle empty optional fields
  if (rawData.wholesalePrice === "") delete rawData.wholesalePrice;
  if (rawData.costPrice === "") delete rawData.costPrice;
  if (rawData.sku === "") delete rawData.sku;
  if (rawData.barcode === "") delete rawData.barcode;
  if (rawData.imgUrl === "") delete rawData.imgUrl;

  const validatedFields = ProductSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: "Invalid fields", issues: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await db.update(items)
      .set({
        productName: validatedFields.data.productName,
        sku: validatedFields.data.sku || null,
        barcode: validatedFields.data.barcode || null,
        categoryId: validatedFields.data.categoryId,
        quantity: validatedFields.data.quantity,
        retailPrice: validatedFields.data.retailPrice.toString(),
        wholesalePrice: validatedFields.data.wholesalePrice ? validatedFields.data.wholesalePrice.toString() : null,
        costPrice: validatedFields.data.costPrice ? validatedFields.data.costPrice.toString() : null,
        minStockLevel: validatedFields.data.minStockLevel,
        priceType: validatedFields.data.priceType,
        imgUrl: validatedFields.data.imgUrl || null,
      })
      .where(eq(items.id, id));
    
    revalidateTag('products', 'max');
    revalidateTag('dashboard', 'max');
    return { success: true };
  } catch (error: any) {
    console.error("Update Product Error:", error);
    if (error.code === '23505') { // Unique constraint violation
      return { error: "Product with this Name, SKU or Barcode already exists" };
    }
    return { error: "Failed to update product" };
  }
}

export async function deactivateProduct(id: string) {
    try {
        await db.update(items)
            .set({ isActive: false })
            .where(eq(items.id, id));
        revalidateTag('products', 'max');
        revalidateTag('dashboard', 'max');
        return { success: true };
    } catch (error) {
        return { error: "Failed to deactivate product" };
    }
}
