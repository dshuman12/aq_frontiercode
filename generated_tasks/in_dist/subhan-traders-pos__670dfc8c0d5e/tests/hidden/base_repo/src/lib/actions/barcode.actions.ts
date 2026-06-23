"use server";

import { db } from "@/db";
import { items } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { revalidateTag } from "next/cache";

/**
 * Update the barcode for a specific product
 */
export async function updateProductBarcode(
  productId: string,
  barcode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if barcode already exists on another product
    const existingProduct = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.barcode, barcode), ne(items.id, productId)))
      .limit(1);

    if (existingProduct.length > 0) {
      return { success: false, error: "Barcode already exists on another product" };
    }

    // Update the product barcode
    await db
      .update(items)
      .set({ barcode, updatedAt: new Date() })
      .where(eq(items.id, productId));

    revalidateTag('products', 'max');
    return { success: true };
  } catch (error) {
    console.error("Failed to update product barcode:", error);
    return { success: false, error: "Failed to update barcode" };
  }
}

/**
 * Check if a barcode is unique in the database
 */
export async function checkBarcodeUniqueness(
  barcode: string,
  excludeProductId?: string
): Promise<{ isUnique: boolean; existingProductName?: string }> {
  try {
    const query = excludeProductId
      ? and(eq(items.barcode, barcode), ne(items.id, excludeProductId))
      : eq(items.barcode, barcode);

    const existingProducts = await db
      .select({ id: items.id, productName: items.productName })
      .from(items)
      .where(query)
      .limit(1);

    if (existingProducts.length > 0) {
      return {
        isUnique: false,
        existingProductName: existingProducts[0].productName,
      };
    }

    return { isUnique: true };
  } catch (error) {
    console.error("Failed to check barcode uniqueness:", error);
    return { isUnique: false };
  }
}

/**
 * Remove barcode from a product
 */
export async function removeProductBarcode(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(items)
      .set({ barcode: null, updatedAt: new Date() })
      .where(eq(items.id, productId));

    revalidateTag('products', 'max');
    return { success: true };
  } catch (error) {
    console.error("Failed to remove product barcode:", error);
    return { success: false, error: "Failed to remove barcode" };
  }
}

/**
 * Get product by barcode (for scanning)
 */
export async function getProductByBarcode(barcode: string) {
  try {
    const product = await db
      .select()
      .from(items)
      .where(eq(items.barcode, barcode))
      .limit(1);

    if (product.length === 0) {
      return { success: false, error: "Product not found" };
    }

    return { success: true, product: product[0] };
  } catch (error) {
    console.error("Failed to get product by barcode:", error);
    return { success: false, error: "Failed to find product" };
  }
}
