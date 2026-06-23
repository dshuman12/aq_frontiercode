'use client';

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePurchaseOrder } from "@/lib/actions/supplier.actions";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface PurchaseOrderItem {
    id: string;
    productNameSnapshot: string;
    quantity: number;
    purchasePrice: string;
    itemTotal: string;
}

interface EditPurchaseOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseOrder: {
        id: string;
        purchaseDate: string;
        notes: string | null;
        items: PurchaseOrderItem[];
    };
    onSuccess?: () => void;
}

interface EditableItem {
    id: string;
    productNameSnapshot: string;
    quantity: number;
    purchasePrice: number | string;
    itemTotal: number;
}

export function EditPurchaseOrderDialog({
    open,
    onOpenChange,
    purchaseOrder,
    onSuccess,
}: EditPurchaseOrderDialogProps) {
    const [isPending, startTransition] = useTransition();
    const [notes, setNotes] = useState(purchaseOrder.notes || "");
    const [editableItems, setEditableItems] = useState<EditableItem[]>([]);

    useEffect(() => {
        if (open) {
            setNotes(purchaseOrder.notes || "");
            setEditableItems(
                purchaseOrder.items.map(item => ({
                    id: item.id,
                    productNameSnapshot: item.productNameSnapshot,
                    quantity: item.quantity,
                    purchasePrice: parseFloat(item.purchasePrice),
                    itemTotal: parseFloat(item.itemTotal),
                }))
            );
        }
    }, [open, purchaseOrder]);

    const updateItem = (index: number, field: 'quantity' | 'purchasePrice', value: number | string) => {
        setEditableItems(prev => {
            const updated = [...prev];
            const newPrice = field === 'purchasePrice' ? value : updated[index].purchasePrice;
            const newQty = field === 'quantity' ? (value as number) : updated[index].quantity;
            updated[index] = {
                ...updated[index],
                [field]: value,
                itemTotal: newQty * (Number(newPrice) || 0),
            };
            return updated;
        });
    };

    const newTotal = editableItems.reduce((sum, item) => sum + item.itemTotal, 0);

    const handleSubmit = () => {
        // Validate all items have valid values
        for (const item of editableItems) {
            if (item.quantity <= 0) {
                toast.error(`Quantity must be positive for ${item.productNameSnapshot}`);
                return;
            }
            if (Number(item.purchasePrice) < 0) {
                toast.error(`Price must be non-negative for ${item.productNameSnapshot}`);
                return;
            }
        }

        startTransition(async () => {
            const result = await updatePurchaseOrder(purchaseOrder.id, {
                notes: notes || undefined,
                items: editableItems.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    purchasePrice: Number(item.purchasePrice) || 0,
                })),
            });

            if (result.success) {
                toast.success("Purchase order updated successfully");
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.error(result.error || "Failed to update purchase order");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Purchase Order</DialogTitle>
                    <DialogDescription>
                        {new Date(purchaseOrder.purchaseDate).toLocaleDateString()} — {purchaseOrder.items.length} item(s)
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
                    {/* Items Table */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Items</Label>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-3 py-2 text-left font-medium">Product</th>
                                        <th className="px-3 py-2 text-center font-medium w-24">Qty</th>
                                        <th className="px-3 py-2 text-center font-medium w-32">Price (Rs.)</th>
                                        <th className="px-3 py-2 text-right font-medium w-28">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editableItems.map((item, index) => (
                                        <tr key={item.id} className="border-b last:border-0">
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {item.productNameSnapshot}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-center"
                                                    value={item.quantity}
                                                    min={1}
                                                    onChange={(e) =>
                                                        updateItem(index, 'quantity', parseInt(e.target.value) || 0)
                                                    }
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-center"
                                                    value={item.purchasePrice}
                                                    min={0}
                                                    step="any"
                                                    onChange={(e) =>
                                                        updateItem(index, 'purchasePrice', e.target.value)
                                                    }
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium">
                                                Rs. {item.itemTotal.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-muted/30">
                                        <td colSpan={3} className="px-3 py-2 text-right font-semibold">
                                            New Total:
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold">
                                            Rs. {newTotal.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="grid gap-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes..."
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
