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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordSupplierPayment } from "@/lib/actions/supplier.actions";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface SupplierPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplierId: string;
    purchaseOrder: {
        id: string;
        purchaseDate: string;
        remainingAmount: string;
    };
    onSuccess?: () => void;
}

export function SupplierPaymentDialog({
    open,
    onOpenChange,
    supplierId,
    purchaseOrder,
    onSuccess,
}: SupplierPaymentDialogProps) {
    const [isPending, startTransition] = useTransition();

    const maxAmount = parseFloat(purchaseOrder.remainingAmount);
    const [amount, setAmount] = useState<string>(maxAmount.toString());
    const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
    const [notes, setNotes] = useState("");

    const handleSubmit = () => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        if (parsedAmount > maxAmount) {
            toast.error(`Amount cannot exceed Rs. ${maxAmount.toLocaleString()}`);
            return;
        }

        startTransition(async () => {
            const result = await recordSupplierPayment({
                supplierId,
                purchaseOrderId: purchaseOrder.id,
                amount: parsedAmount,
                paymentMethod: paymentMethod as "CASH" | "CARD" | "ONLINE_PAYMENT",
                notes: notes || undefined,
            });

            if (result.success) {
                toast.success("Payment recorded successfully");
                onOpenChange(false);
                setAmount("");
                setNotes("");
                onSuccess?.();
            } else {
                toast.error(result.error || "Failed to record payment");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                        Purchase Order — {new Date(purchaseOrder.purchaseDate).toLocaleDateString()} — Outstanding: Rs.{" "}
                        {maxAmount.toLocaleString()}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid gap-2">
                        <Label>Payment Amount (Rs.)</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                max={maxAmount}
                                min={1}
                                step="0.01"
                                placeholder="0.00"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                onClick={() => setAmount(maxAmount.toString())}
                            >
                                Pay Full
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Payment Method</Label>
                        <Select
                            value={paymentMethod}
                            onValueChange={setPaymentMethod}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="CARD">Card</SelectItem>
                                <SelectItem value="ONLINE_PAYMENT">
                                    Online Payment
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this payment..."
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
                        Record Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
