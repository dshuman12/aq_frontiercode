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
import { createCustomer, updateCustomer } from "@/lib/actions/customer.actions";
import { createCustomerOffline } from "@/offline/offline-service";
import { CloudOff, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface CustomerFormProps {
    onSuccess: () => void;
    customer?: {
        id: string;
        name: string;
        phone: string;
        cnic: string | null;
        address: string | null;
    };
}

export function CustomerForm({ onSuccess, customer }: CustomerFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations("customers");
    const tc = useTranslations("common");

    const isEditMode = !!customer;

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);

        const name = formData.get("name") as string;
        const phone = formData.get("phone") as string;
        const cnic = formData.get("cnic") as string;
        const address = formData.get("address") as string;

        if (isEditMode) {
            // Edit mode — call updateCustomer server action
            const result = await updateCustomer(customer.id, {
                name,
                phone,
                cnic: cnic || undefined,
                address: address || undefined,
            });
            setIsLoading(false);

            if (result.success) {
                toast.success(t("customerUpdated"));
                router.refresh();
                onSuccess();
            } else {
                toast.error(result.error || t("failedToUpdateCustomer"));
            }
            return;
        }

        // Create mode
        if (!navigator.onLine) {
            const result = await createCustomerOffline({
                name,
                phone,
                cnic: cnic || null,
                address: address || null,
            });

            setIsLoading(false);

            if (result.success) {
                toast.success(t("customerSavedOffline"), {
                    icon: <CloudOff className="h-4 w-4" />,
                });
                router.refresh();
                onSuccess();
            } else {
                toast.error(t("failedToSaveCustomerOffline"));
            }
            return;
        }

        // Online create
        const result = await createCustomer(formData);
        setIsLoading(false);

        if (result.success) {
            toast.success(t("customerCreated"));
            router.refresh();
            onSuccess();
        } else {
            toast.error(result.error || t("failedToCreateCustomer"));
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="name">{tc("name")}</Label>
                <Input
                    id="name"
                    name="name"
                    required
                    placeholder="John Doe"
                    defaultValue={customer?.name ?? ""}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input
                    id="phone"
                    name="phone"
                    required
                    placeholder="03001234567"
                    defaultValue={customer?.phone ?? ""}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="cnic">{t("cnicOptional")}</Label>
                <Input
                    id="cnic"
                    name="cnic"
                    placeholder="00000-0000000-0"
                    defaultValue={customer?.cnic ?? ""}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="address">{t("addressOptional")}</Label>
                <Input
                    id="address"
                    name="address"
                    placeholder="House #123, Street ABC"
                    defaultValue={customer?.address ?? ""}
                />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                    ? tc("saving")
                    : isEditMode
                        ? t("updateCustomer")
                        : t("createCustomer")}
            </Button>
        </form>
    );
}

export function AddCustomerDialog() {
    const [open, setOpen] = useState(false);
    const t = useTranslations("customers");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> {t("addCustomer")}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("addNewCustomer")}</DialogTitle>
                </DialogHeader>
                <CustomerForm onSuccess={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}

export function EditCustomerDialog({
    customer,
    trigger,
}: {
    customer: {
        id: string;
        name: string;
        phone: string;
        cnic: string | null;
        address: string | null;
    };
    trigger?: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const t = useTranslations("customers");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("editCustomer")}</DialogTitle>
                </DialogHeader>
                <CustomerForm
                    customer={customer}
                    onSuccess={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
