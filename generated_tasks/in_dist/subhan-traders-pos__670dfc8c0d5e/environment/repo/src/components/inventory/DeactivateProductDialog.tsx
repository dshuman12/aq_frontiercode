"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deactivateProduct } from "@/lib/actions/product.actions";
import { EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface DeactivateProductDialogProps {
    productId: string;
    productName: string;
    onProductDeactivated?: () => void;
}

export function DeactivateProductDialog({ productId, productName, onProductDeactivated }: DeactivateProductDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const t = useTranslations("inventory");
    const tc = useTranslations("common");

    function handleDeactivate() {
        startTransition(async () => {
            const result = await deactivateProduct(productId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(t("productDeactivated"));
                setOpen(false);
                onProductDeactivated?.();
            }
        });
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400" title={t("deactivateProduct")}>
                    <EyeOff className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("deactivateProduct")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("confirmDeactivateProduct", { name: productName })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>{tc("cancel")}</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeactivate} 
                        disabled={isPending}
                        className="bg-amber-600 text-white hover:bg-amber-700"
                    >
                        {isPending ? t("deactivating") : t("deactivate")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
