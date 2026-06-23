"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
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
import { recordCustomerPayment } from "@/lib/actions/customer.actions";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface CustomerPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerId: string;
    order: {
        id: string;
        invoiceId: string;
        outstandingAmount: string;
    };
    onSuccess?: () => void;
}

export function CustomerPaymentDialog({
    open,
    onOpenChange,
    customerId,
    order,
    onSuccess,
}: CustomerPaymentDialogProps) {
    const router = useRouter();
    const t = useTranslations("customers");
    const tc = useTranslations("common");
    const [isPending, startTransition] = useTransition();

    const maxAmount = parseFloat(order.outstandingAmount);
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
            toast.error(t("amountCannotExceed"));
            return;
        }

        startTransition(async () => {
            const result = await recordCustomerPayment({
                customerId,
                orderId: order.id,
                amount: parsedAmount,
                paymentMethod: paymentMethod as "CASH" | "CARD" | "ONLINE_PAYMENT",
                notes: notes || undefined,
            });

            if (result.success) {
                toast.success(t("paymentRecorded"));
                router.refresh();
                onOpenChange(false);
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
                    <DialogTitle>{t("recordPayment")}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Invoice #{order.invoiceId} — Outstanding: Rs.{" "}
                        {maxAmount.toLocaleString()}
                    </p>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid gap-2">
                        <Label>{t("paymentAmount")}</Label>
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
                                {t("payFull")}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>{t("paymentMethod")}</Label>
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
                        <Label>{t("paymentNotes")}</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes..."
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {tc("cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {t("recordPayment")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
