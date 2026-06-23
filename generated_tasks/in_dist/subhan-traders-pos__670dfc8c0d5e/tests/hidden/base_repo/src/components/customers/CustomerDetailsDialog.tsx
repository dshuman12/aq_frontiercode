"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Banknote,
    CreditCard,
    Eye,
    Loader2,
    Receipt,
    ShoppingBag,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { CustomerPaymentDialog } from "./CustomerPaymentDialog";

interface OrderDetail {
    id: string;
    invoiceId: string;
    createdAt: string;
    totalPrice: string;
    paidAmount: string;
    outstandingAmount: string;
    orderStatus: string;
    paymentMethod: string | null;
    isWholesale: boolean;
    items: any[];
    payments: any[];
}

interface CustomerDetail {
    id: string;
    name: string;
    phone: string;
    cnic: string | null;
    address: string | null;
    paidAmount: string;
    outstandingAmount: string;
    orders: OrderDetail[];
}

interface CustomerDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerId: string;
}

const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    PARTIALLY_PAID: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    FULLY_PAID: "bg-green-500/10 text-green-600 border-green-500/20",
    CANCELLED: "bg-red-500/10 text-red-600 border-red-500/20",
};

const statusLabels: Record<string, string> = {
    PENDING: "Pending",
    PARTIALLY_PAID: "Partially Paid",
    FULLY_PAID: "Fully Paid",
    CANCELLED: "Cancelled",
};

export function CustomerDetailsDialog({
    open,
    onOpenChange,
    customerId,
}: CustomerDetailsDialogProps) {
    const t = useTranslations("customers");
    const to = useTranslations("orders");

    const [customer, setCustomer] = useState<CustomerDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [paymentOrder, setPaymentOrder] = useState<OrderDetail | null>(null);

    const fetchCustomer = useCallback(async () => {
        if (!customerId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/customers/${customerId}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setCustomer(data);
        } catch {
            setCustomer(null);
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    useEffect(() => {
        if (open && customerId) {
            fetchCustomer();
        }
    }, [open, customerId, fetchCustomer]);

    const totalPaid = customer ? parseFloat(customer.paidAmount) : 0;
    const totalOutstanding = customer
        ? parseFloat(customer.outstandingAmount)
        : 0;
    const totalOrders = customer?.orders?.length ?? 0;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            {t("customerDetails")}
                        </DialogTitle>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : customer ? (
                        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                            {/* Customer Info */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pb-4 border-b">
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        {customer.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {customer.phone}
                                        {customer.cnic &&
                                            ` • ${customer.cnic}`}
                                    </p>
                                    {customer.address && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {customer.address}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <SummaryCard
                                    icon={
                                        <ShoppingBag className="h-4 w-4 text-blue-500" />
                                    }
                                    label={t("totalOrders")}
                                    value={totalOrders.toString()}
                                />
                                <SummaryCard
                                    icon={
                                        <Banknote className="h-4 w-4 text-green-500" />
                                    }
                                    label={t("totalPaid")}
                                    value={`Rs. ${totalPaid.toLocaleString()}`}
                                    className="text-green-600"
                                />
                                <SummaryCard
                                    icon={
                                        <CreditCard className="h-4 w-4 text-red-500" />
                                    }
                                    label={t("totalOutstanding")}
                                    value={`Rs. ${totalOutstanding.toLocaleString()}`}
                                    className="text-red-600"
                                />
                            </div>

                            {/* Transaction History */}
                            <div>
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                    <Receipt className="h-4 w-4" />
                                    {t("transactionHistory")}
                                </h4>

                                {totalOrders === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
                                        {t("noTransactionsFound")}
                                    </div>
                                ) : (
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>
                                                        {to("invoiceId")}
                                                    </TableHead>
                                                    <TableHead>
                                                        {to("date")}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {to("amount")}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t("paidAmount")}
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        {t("outstandingAmount")}
                                                    </TableHead>
                                                    <TableHead>
                                                        {to("status")}
                                                    </TableHead>
                                                    <TableHead></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {customer.orders.map(
                                                    (order) => {
                                                        const outstanding =
                                                            parseFloat(
                                                                order.outstandingAmount
                                                            );
                                                        return (
                                                            <TableRow
                                                                key={order.id}
                                                            >
                                                                <TableCell className="font-mono text-xs">
                                                                    #
                                                                    {
                                                                        order.invoiceId
                                                                    }
                                                                </TableCell>
                                                                <TableCell className="text-sm">
                                                                    {new Date(
                                                                        order.createdAt
                                                                    ).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    Rs.{" "}
                                                                    {parseFloat(
                                                                        order.totalPrice
                                                                    ).toLocaleString()}
                                                                </TableCell>
                                                                <TableCell className="text-right text-green-600">
                                                                    Rs.{" "}
                                                                    {parseFloat(
                                                                        order.paidAmount
                                                                    ).toLocaleString()}
                                                                </TableCell>
                                                                <TableCell className="text-right text-red-600">
                                                                    {outstanding >
                                                                    0
                                                                        ? `Rs. ${outstanding.toLocaleString()}`
                                                                        : "—"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={
                                                                            statusColors[
                                                                                order
                                                                                    .orderStatus
                                                                            ] ||
                                                                            ""
                                                                        }
                                                                    >
                                                                        {statusLabels[
                                                                            order
                                                                                .orderStatus
                                                                        ] ||
                                                                            order.orderStatus}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {outstanding >
                                                                        0 &&
                                                                        order.orderStatus !==
                                                                            "CANCELLED" && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="text-xs"
                                                                                onClick={() =>
                                                                                    setPaymentOrder(
                                                                                        order
                                                                                    )
                                                                                }
                                                                            >
                                                                                {t(
                                                                                    "recordPayment"
                                                                                )}
                                                                            </Button>
                                                                        )}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    }
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            {t("noCustomersFound")}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            {paymentOrder && customer && (
                <CustomerPaymentDialog
                    open={!!paymentOrder}
                    onOpenChange={(val) => {
                        if (!val) setPaymentOrder(null);
                    }}
                    customerId={customer.id}
                    order={paymentOrder}
                    onSuccess={() => {
                        setPaymentOrder(null);
                        fetchCustomer(); // Refresh data after payment
                    }}
                />
            )}
        </>
    );
}

function SummaryCard({
    icon,
    label,
    value,
    className,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {label}
                </span>
            </div>
            <p className={`text-xl font-bold ${className || ""}`}>{value}</p>
        </div>
    );
}
