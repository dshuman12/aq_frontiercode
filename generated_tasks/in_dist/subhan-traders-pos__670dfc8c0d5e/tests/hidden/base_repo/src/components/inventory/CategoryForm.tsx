"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createCategory, deleteCategory, updateCategory } from "@/lib/actions/category.actions";
import { createCategoryOffline, deleteCategoryOffline } from "@/offline/offline-service";
import { CloudOff, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CategoryForm({ onSuccess }: { onSuccess?: () => void }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);

        // Check if offline
        if (!navigator.onLine) {
            const result = await createCategoryOffline({ name: name.trim() });
            setIsLoading(false);
            
            if (result.success) {
                toast.success("Category saved offline - will sync when online", {
                    icon: <CloudOff className="h-4 w-4" />,
                });
                setName("");
                router.refresh();
                onSuccess?.();
            } else {
                toast.error("Failed to save category offline");
            }
            return;
        }

        // Online - use server action
        const formData = new FormData();
        formData.append("name", name);
        
        const result = await createCategory(formData);
        setIsLoading(false);
        
        if (result.success) {
            toast.success("Category created successfully");
            setName("");
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(result.error || "Failed to create category");
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-4">
            <Input 
                name="name" 
                placeholder="New category name" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add"}
            </Button>
        </form>
    );
}

export function EditCategoryButton({ categoryId, categoryName, onSuccess }: { categoryId: string; categoryName: string; onSuccess?: () => void }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState(categoryName);
    const [open, setOpen] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || name.trim() === categoryName) {
            setOpen(false);
            return;
        }

        setIsLoading(true);

        const formData = new FormData();
        formData.append("name", name.trim());

        const result = await updateCategory(categoryId, formData);
        setIsLoading(false);

        if (result.success) {
            toast.success("Category updated successfully");
            setOpen(false);
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(result.error || "Failed to update category");
        }
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (isOpen) setName(categoryName);
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Category</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex gap-3">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Category name"
                        required
                        autoFocus
                    />
                    <Button type="submit" disabled={isLoading || !name.trim()}>
                        {isLoading ? "Saving..." : "Save"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function handleDelete() {
        setIsLoading(true);

        // Check if offline
        if (!navigator.onLine) {
            const result = await deleteCategoryOffline(categoryId);
            setIsLoading(false);
            
            if (result.success) {
                toast.success("Category deleted offline - will sync when online", {
                    icon: <CloudOff className="h-4 w-4" />,
                });
                router.refresh();
            } else {
                toast.error("Failed to delete category offline");
            }
            return;
        }

        // Online - use server action
        const result = await deleteCategory(categoryId);
        setIsLoading(false);
        
        if (result.success) {
            toast.success("Category deleted successfully");
            router.refresh();
        } else {
            toast.error(result.error || "Failed to delete category");
        }
    }

    return (
        <Button 
            variant="destructive" 
            size="icon" 
            onClick={handleDelete} 
            disabled={isLoading}
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    );
}
