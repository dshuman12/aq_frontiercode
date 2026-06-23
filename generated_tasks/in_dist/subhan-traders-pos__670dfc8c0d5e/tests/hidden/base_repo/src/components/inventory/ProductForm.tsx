"use client";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createProduct } from "@/lib/actions/product.actions";
import { ProductFormValues, ProductSchema } from "@/lib/validations/product";
import { createProductOffline } from "@/offline/offline-service";
import { zodResolver } from "@hookform/resolvers/zod";
import { CloudOff, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { generateUniqueBarcode } from "./BarcodeGenerator";

// Define simpler Category type for props
interface Category {
  id: string;
  name: string;
}

interface ProductFormProps {
    categories: Category[];
    setOpen?: (open: boolean) => void;
}

export function ProductForm({ categories, setOpen }: ProductFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Track online status
    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => setIsOffline(false));
        window.addEventListener('offline', () => setIsOffline(true));
    }

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(ProductSchema) as any,
        defaultValues: {
            productName: "",
            sku: "",
            barcode: "",
            categoryId: "",
            quantity: 0,
            retailPrice: 0,
            minStockLevel: 5,
            priceType: "RETAIL",
            imgUrl: "",
        },
    });

    async function onSubmit(data: ProductFormValues) {
        startTransition(async () => {
            // Check if offline
            if (!navigator.onLine) {
                // Save offline
                const result = await createProductOffline({
                    productName: data.productName,
                    sku: data.sku || null,
                    barcode: data.barcode || null,
                    categoryId: data.categoryId || null,
                    quantity: Number(data.quantity),
                    retailPrice: Number(data.retailPrice),
                    wholesalePrice: data.wholesalePrice ? Number(data.wholesalePrice) : null,
                    costPrice: data.costPrice ? Number(data.costPrice) : null,
                    minStockLevel: Number(data.minStockLevel) || 5,
                    priceType: data.priceType || 'RETAIL',
                    imgUrl: data.imgUrl || null,
                });

                if (result.success) {
                    toast.success("Product saved offline - will sync when online", {
                        icon: <CloudOff className="h-4 w-4" />,
                    });
                    form.reset();
                    router.refresh();
                    if (setOpen) setOpen(false);
                } else {
                    toast.error("Failed to save product offline");
                }
                return;
            }

            // Online - use server action
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, value.toString());
                }
            });

            const result = await createProduct(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Product created successfully");
                form.reset();
                router.refresh();
                if (setOpen) setOpen(false);
            }
        });
    }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Image Upload */}
        <FormField
          control={form.control}
          name="imgUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Image</FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="productName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="Super Star 70cc" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            
             <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <div className="flex gap-2">
                        <FormControl>
                            <Input placeholder="Scan or enter" {...field} className="flex-1" />
                        </FormControl>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                const newBarcode = generateUniqueBarcode("ST");
                                field.onChange(newBarcode);
                                toast.success("Barcode generated!");
                            }}
                            title="Auto-generate barcode"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-3 gap-4">
            <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="retailPrice"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Retail Price</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="wholesalePrice"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Wholesale (Opt)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Product'}
        </Button>
      </form>
    </Form>
  );
}
