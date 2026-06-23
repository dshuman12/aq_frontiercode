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
import { Label } from "@/components/ui/label";
import { adjustStock } from "@/lib/actions/inventory.actions";
import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function StockAdjustmentDialog({ itemId, itemName }: { itemId: string, itemName: string }) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        const result = await adjustStock(formData);
        if (result.success) {
            toast.success("Stock adjusted successfully");
            setOpen(false);
            router.refresh();
        } else {
            toast.error(result.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Adjust Stock">
                    <SlidersHorizontal className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adjust Stock: {itemName}</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    <input type="hidden" name="itemId" value={itemId} />
                    <div className="grid gap-2">
                        <Label>Quantity Change (+/-)</Label>
                        <Input type="number" name="quantityChange" placeholder="e.g. 10 or -5" required />
                        <p className="text-xs text-muted-foreground">Use negative values to reduce stock (e.g. -2 for damage).</p>
                    </div>
                    <div className="grid gap-2">
                        <Label>Reason</Label>
                        <Input name="reason" placeholder="e.g. Damage, Audit Correction, Gift" required />
                    </div>
                    <Button type="submit" className="w-full">Save Adjustment</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
