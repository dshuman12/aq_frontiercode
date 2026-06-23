'use server';

import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";

export async function createCategory(formData: FormData) {
  const name = formData.get("name") as string;
  
  if (!name) {
    return { error: "Name is required" };
  }

  try {
    await db.insert(categories).values({ name });
    revalidateTag('categories', 'max');
    revalidateTag('products', 'max'); // Categories affect product display
    return { success: true };
  } catch (error) {
    return { error: "Failed to create category. Use a unique name." };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  const name = formData.get("name") as string;

  if (!name || !name.trim()) {
    return { error: "Name is required" };
  }

  try {
    await db.update(categories).set({ name: name.trim() }).where(eq(categories.id, id));
    revalidateTag('categories', 'max');
    revalidateTag('products', 'max');
    return { success: true };
  } catch (error) {
    return { error: "Failed to update category. Use a unique name." };
  }
}

export async function deleteCategory(id: string) {
    try {
        await db.delete(categories).where(eq(categories.id, id));
        revalidateTag('categories', 'max');
        revalidateTag('products', 'max');
        return { success: true };
    } catch (error) {
        return { error: "Failed to delete category" };
    }
}

export async function getAllCategories() {
  try {
    const data = await db.select().from(categories);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return { success: false, error: "Failed to fetch categories" };
  }
}
