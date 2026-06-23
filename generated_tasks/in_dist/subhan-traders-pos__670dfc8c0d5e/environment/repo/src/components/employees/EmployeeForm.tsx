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
import { createEmployee } from "@/lib/actions/employee.actions";
import { createEmployeeOffline } from "@/offline/offline-service";
import { CloudOff, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface EmployeeFormProps {
    onSuccess: () => void;
}

export function EmployeeForm({ onSuccess }: EmployeeFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations("employees");
    const tc = useTranslations("common");
    const tcust = useTranslations("customers");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const name = formData.get("name") as string;
        const cnic = formData.get("cnic") as string;
        const phone = formData.get("phone") as string;
        const salary = parseFloat(formData.get("salary") as string);

        setIsLoading(true);

        // Check if offline
        if (!navigator.onLine) {
            const result = await createEmployeeOffline({
                name,
                cnic,
                phone: phone || null,
                salary,
            });
            setIsLoading(false);
            
            if (result.success) {
                toast.success(t("employeeSavedOffline"), {
                    icon: <CloudOff className="h-4 w-4" />,
                });
                router.refresh();
                onSuccess();
            } else {
                toast.error(t("failedToSaveEmployeeOffline"));
            }
            return;
        }

        // Online - use server action
        const result = await createEmployee(formData);
        setIsLoading(false);
        
        if (result.success) {
            toast.success(t("employeeCreated"));
            router.refresh();
            onSuccess();
        } else {
            toast.error(result.error || t("failedToCreateEmployee"));
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="name">{tc("name")}</Label>
                <Input id="name" name="name" required placeholder="Ali Khan" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="cnic">{tcust("cnic")}</Label>
                <Input id="cnic" name="cnic" required placeholder="35202-..." />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">{tc("phone")}</Label>
                <Input id="phone" name="phone" placeholder="0300..." />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="salary">{t("salary")}</Label>
                <Input id="salary" name="salary" type="number" required placeholder="25000" />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? tc("creating") : t("createEmployee")}
            </Button>
        </form>
    );
}

export function AddEmployeeDialog() {
    const [open, setOpen] = useState(false);
    const t = useTranslations("employees");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> {t("addEmployee")}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("addNewEmployee")}</DialogTitle>
                </DialogHeader>
                <EmployeeForm onSuccess={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}
