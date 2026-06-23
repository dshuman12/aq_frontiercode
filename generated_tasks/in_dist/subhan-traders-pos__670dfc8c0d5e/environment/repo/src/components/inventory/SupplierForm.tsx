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
import { createSupplier } from "@/lib/actions/supplier.actions";
import { createSupplierOffline } from "@/offline/offline-service";
import { CloudOff, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface SupplierFormProps {
    onSuccess: () => void;
}

export function SupplierForm({ onSuccess }: SupplierFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const name = formData.get("name") as string;
        const phone = formData.get("phone") as string;
        const address = formData.get("address") as string;

        setIsLoading(true);

        // Check if offline
        if (!navigator.onLine) {
            const result = await createSupplierOffline({
                name,
                phone,
                address: address || null,
            });
            setIsLoading(false);
            
            if (result.success) {
                toast.success("Supplier saved offline - will sync when online", {
                    icon: <CloudOff className="h-4 w-4" />,
                });
                router.refresh();
                onSuccess();
            } else {
                toast.error("Failed to save supplier offline");
            }
            return;
        }

        // Online - use server action
        const result = await createSupplier(formData);
        setIsLoading(false);
        
        if (result.success) {
            toast.success("Supplier created successfully");
            router.refresh();
            onSuccess();
        } else {
            toast.error(result.error || "Failed to create supplier");
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="Supplier Name" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" required placeholder="03001234567" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input id="address" name="address" placeholder="Business Address" />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Supplier"}
            </Button>
        </form>
    );
}

export function AddSupplierDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Supplier
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Supplier</DialogTitle>
                </DialogHeader>
                <SupplierForm onSuccess={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}
