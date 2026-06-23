"use client";

import { Button } from "@/components/ui/button";
import { deleteCategory } from "@/lib/actions/category.actions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function handleDelete() {
        setIsLoading(true);
        try {
            await deleteCategory(categoryId);
            toast.success("Category deleted");
            router.refresh();
        } catch {
            toast.error("Failed to delete category");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Button 
            variant="ghost" 
            size="icon" 
            className="text-red-500" 
            onClick={handleDelete}
            disabled={isLoading}
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    );
}
