"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
    SelectValue
} from "@/components/ui/select";
import { updateProduct } from "@/lib/actions/product.actions";
import { ProductFormDefaults, ProductSchema } from "@/lib/validations/product";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";

interface Category {
    id: string;
    name: string;
}

interface Product {
    id: string;
    productName: string;
    categoryId: string | null;
    quantity: number;
    retailPrice: number;
    wholesalePrice?: number | null;
    costPrice?: number | null;
    minStockLevel: number;
    sku?: string | null;
    barcode?: string | null;
    priceType?: "RETAIL" | "WHOLESALE";
    imgUrl?: string | null;
}

interface EditProductDialogProps {
    product: Product;
    categories: Category[];
    onProductUpdated?: () => void;
}

export function EditProductDialog({ product, categories, onProductUpdated }: EditProductDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const t = useTranslations("inventory");
    const tc = useTranslations("common");

    const resolver = zodResolver(ProductSchema) as unknown as Resolver<ProductFormDefaults>;

    const form = useForm<ProductFormDefaults>({
        resolver,
        defaultValues: {
            productName: product.productName,
            categoryId: product.categoryId || "",
            quantity: product.quantity,
            retailPrice: product.retailPrice,
            wholesalePrice: product.wholesalePrice ?? undefined,
            costPrice: product.costPrice ?? undefined,
            minStockLevel: product.minStockLevel,
            sku: product.sku ?? undefined,
            barcode: product.barcode ?? undefined,
            priceType: product.priceType || "RETAIL",
            imgUrl: product.imgUrl ?? undefined,
        },
    });

    function onSubmit(data: ProductFormDefaults) {
        startTransition(async () => {
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, value.toString());
                }
            });

            const result = await updateProduct(product.id, formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(t("productUpdated"));
                setOpen(false);
                onProductUpdated?.();
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title={t("editProduct")}>
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("editProduct")}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Image Upload */}
                        <FormField
                            control={form.control}
                            name="imgUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("productImage") || "Product Image"}</FormLabel>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="productName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("productName")}</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("category")}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("selectCategory")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("quantity")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
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
                                        <FormLabel>{t("retailPrice")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
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
                                        <FormLabel>{t("wholesalePrice")} ({t("optional")})</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                {...field} 
                                                value={field.value ?? ""} 
                                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="costPrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("costPrice")} ({t("optional")})</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                {...field} 
                                                value={field.value ?? ""} 
                                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="minStockLevel"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("minStockLevel")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("sku")} ({t("optional")})</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="barcode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("barcode")} ({t("optional")})</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                {tc("cancel")}
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? tc("saving") : tc("save")}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
