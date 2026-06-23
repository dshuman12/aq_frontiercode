'use client';


import { AddCustomerDialog, EditCustomerDialog } from "@/components/customers/CustomerForm";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useOfflineData, useOnlineStatus } from "@/hooks/use-offline-data";
import { deleteCustomer } from "@/lib/actions/customer.actions";
import { getAllCustomers } from "@/offline/offline-service";
import { CloudOff, Eye, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Customer {
    id: string;
    name: string;
    phone: string;
    cnic: string | null;
    address: string | null;
    outstandingAmount: number;
    paidAmount: number;
    isActive: boolean;
}

// Server fetcher
async function fetchCustomersFromServer(): Promise<Customer[]> {
    const res = await fetch('/api/customers');
    if (!res.ok) throw new Error('Failed to fetch customers');
    const data = await res.json();
    return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        cnic: c.cnic,
        address: c.address || null,
        outstandingAmount: parseFloat(c.outstandingAmount || '0'),
        paidAmount: parseFloat(c.paidAmount || '0'),
        isActive: c.isActive,
    }));
}

// Offline fetcher
async function fetchCustomersOffline(): Promise<Customer[]> {
    const customers = await getAllCustomers();
    return customers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        cnic: c.cnic,
        address: c.address || null,
        outstandingAmount: c.outstandingAmount,
        paidAmount: c.paidAmount,
        isActive: c.isActive,
    }));
}

function CustomersSkeletonRow() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </TableCell>
        </TableRow>
    );
}

export function CustomersClient() {
    const router = useRouter();
    const isOnline = useOnlineStatus();
    const t = useTranslations("customers");
    const tc = useTranslations("common");
    const [isPending, startTransition] = useTransition();

    // Deactivate confirmation state
    const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

    const { data: customers, isLoading, isOffline, refetch } = useOfflineData(
        fetchCustomersFromServer,
        fetchCustomersOffline,
        {
            refreshOnOnline: true,
            staleTime: 30000,
            cacheKey: 'customers-list'
        }
    );

    const handleDeactivate = () => {
        if (!deleteTarget) return;
        startTransition(async () => {
            const result = await deleteCustomer(deleteTarget.id);
            if (result.success) {
                toast.success(t("customerDeactivated"));
                router.refresh();
                refetch();
            } else {
                toast.error(result.error || "Failed to deactivate customer");
            }
            setDeleteTarget(null);
        });
    };

    const customerList = customers || [];

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
                        {isOffline && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                <CloudOff className="h-3 w-3 mr-1" />
                                {tc("offlineData")}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={refetch} disabled={!isOnline}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        {!isOffline && <AddCustomerDialog />}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("customerList")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tc("name")}</TableHead>
                                    <TableHead>{t("phone")}</TableHead>
                                    <TableHead>{t("cnic")}</TableHead>
                                    <TableHead className="text-right">{t("paidAmount")}</TableHead>
                                    <TableHead className="text-right">{t("outstandingAmount")}</TableHead>
                                    <TableHead className="text-right">{tc("actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(6)].map((_, i) => <CustomersSkeletonRow key={i} />)
                                ) : customerList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">
                                            {t("noCustomersFound")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customerList.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">{customer.name}</TableCell>
                                        <TableCell>{customer.phone}</TableCell>
                                        <TableCell>{customer.cnic || '—'}</TableCell>
                                        <TableCell className="text-right text-green-600">
                                            Rs. {customer.paidAmount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className={`text-right ${customer.outstandingAmount > 0 ? "text-red-500 font-bold" : "text-green-600"}`}>
                                            Rs. {customer.outstandingAmount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={t("customerDetails")}
                                                    onClick={() => router.push(`/customers/${customer.id}`)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {!isOffline && (
                                                    <>
                                                        <EditCustomerDialog customer={customer} />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive"
                                                            title={t("deactivateCustomer")}
                                                            onClick={() => setDeleteTarget(customer)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>



            {/* Deactivate Confirmation */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(val) => {
                    if (!val) setDeleteTarget(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deactivateCustomer")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("confirmDeactivateCustomer", { name: deleteTarget?.name || "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeactivate}
                            disabled={isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isPending ? tc("loading") : tc("confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
