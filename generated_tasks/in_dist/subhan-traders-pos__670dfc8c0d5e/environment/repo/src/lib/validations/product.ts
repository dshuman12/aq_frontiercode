import { z } from "zod";

export const ProductSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  quantity: z.coerce.number().min(0),
  retailPrice: z.coerce.number().min(0, "Retail price must be positive"),
  wholesalePrice: z.coerce.number().optional(),
  costPrice: z.coerce.number().optional(),
  minStockLevel: z.coerce.number().default(5),
  priceType: z.enum(["RETAIL", "WHOLESALE"]).default("RETAIL"),
  imgUrl: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof ProductSchema>;

// Input type for form defaults (with explicit number types for react-hook-form compatibility)
export interface ProductFormDefaults {
  productName: string;
  categoryId: string;
  quantity: number;
  retailPrice: number;
  minStockLevel: number;
  priceType: "RETAIL" | "WHOLESALE";
  sku?: string;
  barcode?: string;
  wholesalePrice?: number;
  costPrice?: number;
  imgUrl?: string;
}
