"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addOrderPayment } from "@/lib/actions/payment.actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AddPaymentForm({ orderId, remainingAmount, onSuccess }: { orderId: string, remainingAmount: number, onSuccess: () => void }) {
    const [amount, setAmount] = useState(remainingAmount); // Default to full remaining
    const [method, setMethod] = useState("CASH");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit() {
        if (amount <= 0) return;
        setLoading(true);
        const result = await addOrderPayment({
            orderId,
            amount,
            method,
        });
        
        if (result.success) {
            toast.success("Payment recorded");
            router.refresh(); // Important to refresh server data
            onSuccess();
        } else {
            toast.error(result.error);
        }
        setLoading(false);
    }

    return (
        <div className="flex gap-2 items-end mt-4 border-t pt-4">
             <div className="grid gap-1 w-24">
                <label className="text-xs">Amount</label>
                <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            </div>
             <div className="grid gap-1 w-32">
                <label className="text-xs">Method</label>
                <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="ONLINE_PAYMENT">Online</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handleSubmit} disabled={loading}>
                {loading ? '...' : 'Add Payment'}
            </Button>
        </div>
    );
}
