"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { addOrderPayment } from "@/lib/actions/payment.actions";
import { Banknote, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface OrderPaymentDialogProps {
    orderId: string;
    invoiceId: string;
    outstandingAmount: number;
    customerName: string | null;
    trigger?: React.ReactNode;
    onPaymentSuccess?: () => void;
}

export function OrderPaymentDialog({
    orderId,
    invoiceId,
    outstandingAmount,
    customerName,
    trigger,
    onPaymentSuccess,
}: OrderPaymentDialogProps) {
    const t = useTranslations("orders");
    const tc = useTranslations("common");
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState(outstandingAmount);
    const [method, setMethod] = useState("CASH");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleOpen = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            // Reset form when opening
            setAmount(outstandingAmount);
            setMethod("CASH");
            setNotes("");
        }
    };

    const handlePayFull = () => {
        setAmount(outstandingAmount);
    };

    const handleSubmit = async () => {
        if (amount <= 0) {
            toast.error(t("amountMustBePositive"));
            return;
        }
        if (amount > outstandingAmount) {
            toast.error(t("amountCannotExceedOutstanding"));
            return;
        }

        setLoading(true);
        try {
            const result = await addOrderPayment({
                orderId,
                amount,
                method,
                notes: notes || undefined,
            });

            if (result.success) {
                toast.success(t("paymentRecordedSuccess"));
                setOpen(false);
                router.refresh();
                onPaymentSuccess?.();
            } else {
                toast.error(result.error ?? t("paymentFailed"));
            }
        } catch (err) {
            console.error("Payment submission error:", err);
            toast.error(t("paymentFailed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" title={t("addPayment")} className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950">
                        <Banknote className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-green-600" />
                        {t("recordPayment")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("recordPaymentFor")} <span className="font-semibold">{invoiceId}</span>
                        {customerName && (
                            <> — <span className="font-medium">{customerName}</span></>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Outstanding balance display */}
                    <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/40 px-4 py-3">
                        <p className="text-sm text-muted-foreground">{t("outstandingBalance")}</p>
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            Rs. {outstandingAmount.toLocaleString()}
                        </p>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="payment-amount">{t("paymentAmount")}</Label>
                        <div className="flex gap-2">
                            <Input
                                id="payment-amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                min={1}
                                max={outstandingAmount}
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handlePayFull}
                                className="shrink-0"
                            >
                                {t("payFull")}
                            </Button>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <Label>{t("paymentMethodLabel")}</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">{t("cash")}</SelectItem>
                                <SelectItem value="CARD">{t("card")}</SelectItem>
                                <SelectItem value="ONLINE_PAYMENT">{t("online")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="payment-notes">{t("notesOptional")}</Label>
                        <Input
                            id="payment-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t("notesPlaceholder")}
                        />
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setOpen(false)}
                        disabled={loading}
                    >
                        {tc("cancel")}
                    </Button>
                    <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleSubmit}
                        disabled={loading || amount <= 0 || amount > outstandingAmount}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("processing")}
                            </>
                        ) : (
                            <>
                                <Banknote className="mr-2 h-4 w-4" />
                                {t("confirmPayment")}
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
