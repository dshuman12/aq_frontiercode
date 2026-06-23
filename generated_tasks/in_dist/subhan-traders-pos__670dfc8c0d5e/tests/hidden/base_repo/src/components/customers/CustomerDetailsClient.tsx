"use client";

import { InvoiceReceipt } from "@/components/pos/InvoiceReceipt";
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
import { OfflineOrder, OfflineOrderItem } from "@/offline/db";
import { ArrowLeft, Banknote, CreditCard, Printer, Receipt, ShoppingBag, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerPaymentDialog } from "./CustomerPaymentDialog";

interface OrderItem {
    id: string;
    productNameSnapshot: string;
    quantity: number;
    appliedPrice: string;
    discountAmount: string;
    itemTotal: string;
}

interface OrderPayment {
    id: string;
    amount: string;
    paymentMethod: string;
    paymentDate: string;
    notes?: string | null;
}

interface OrderDetail {
    id: string;
    invoiceId: string;
    createdAt: string;
    totalPrice: string;
    paidAmount: string;
    outstandingAmount: string;
    subtotal: string;
    totalDiscount: string;
    orderStatus: string;
    paymentMethod: string | null;
    isWholesale: boolean;
    notes?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    walkInCustomerName?: string | null;
    items: OrderItem[];
    payments: OrderPayment[];
}

interface CustomerDetail {
    id: string;
    name: string;
    phone: string;
    cnic: string | null;
    address: string | null;
    paidAmount: string;
    outstandingAmount: string;
}

interface CustomerDetailsClientProps {
    customerId: string;
    initialCustomer: CustomerDetail;
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

function TransactionCard({
    order,
    customer,
    onPaymentSuccess,
}: {
    order: OrderDetail;
    customer: CustomerDetail;
    onPaymentSuccess: () => void;
}) {
    const t = useTranslations("customers");
    const to = useTranslations("orders");
    const printRef = useRef<HTMLDivElement>(null);

    const [paymentOrder, setPaymentOrder] = useState<OrderDetail | null>(null);

    const outstanding = parseFloat(order.outstandingAmount);

    const printOrder: OfflineOrder = {
        id: order.id,
        invoiceId: order.invoiceId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        walkInCustomerName: order.walkInCustomerName || null,
        subtotal: parseFloat(order.subtotal || "0"),
        totalDiscount: parseFloat(order.totalDiscount || "0"),
        totalPrice: parseFloat(order.totalPrice || "0"),
        paidAmount: parseFloat(order.paidAmount || "0"),
        outstandingAmount: parseFloat(order.outstandingAmount || "0"),
        paymentMethod: order.paymentMethod as any,
        orderStatus: order.orderStatus as any,
        isWholesale: order.isWholesale,
        createdAt: order.createdAt,
        synced: true,
        items: order.items.map((item): OfflineOrderItem => ({
            id: item.id,
            orderId: order.id,
            itemId: "temp",
            productNameSnapshot: item.productNameSnapshot || "Unknown Product",
            quantity: item.quantity,
            priceType: "RETAIL",
            appliedPrice: parseFloat(item.appliedPrice || "0"),
            discountAmount: parseFloat(item.discountAmount || "0"),
            itemTotal: parseFloat(item.itemTotal || "0"),
        })),
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Invoice-${order.invoiceId}`,
    });

    return (
        <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/30 border-b">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                        {to("invoiceId")}: <span className="font-mono text-primary">#{order.invoiceId}</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleString()}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className={statusColors[order.orderStatus] || ""}>
                        {statusLabels[order.orderStatus] || order.orderStatus}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => handlePrint()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Receipt
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                {/* Financial Overview */}
                <div className="grid grid-cols-3 gap-4 text-sm bg-muted/10 p-4 rounded-lg border">
                    <div>
                        <p className="text-muted-foreground">{to("amount")}</p>
                        <p className="font-semibold text-lg">Rs. {parseFloat(order.totalPrice || "0").toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">{t("paidAmount")}</p>
                        <p className="font-semibold text-lg text-green-600">Rs. {parseFloat(order.paidAmount || "0").toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">{t("outstandingAmount")}</p>
                        <p className={`font-semibold text-lg ${outstanding > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            Rs. {outstanding.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Optional Notes */}
                {order.notes && (
                    <div className="bg-yellow-50/50 dark:bg-yellow-950/20 p-3 rounded-md border border-yellow-100 dark:border-yellow-900">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Notes:</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{order.notes}</p>
                    </div>
                )}

                {/* Items Table */}
                <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 object-contain text-muted-foreground" />
                        Order Items
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Discount</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {order.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.productNameSnapshot}</TableCell>
                                        <TableCell className="text-right">Rs. {parseFloat(item.appliedPrice || "0").toLocaleString()}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right text-destructive">
                                            {parseFloat(item.discountAmount || "0") > 0 
                                                ? `- Rs. ${parseFloat(item.discountAmount).toLocaleString()}` 
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">Rs. {parseFloat(item.itemTotal || "0").toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Payment History & Actions */}
                <div className="flex flex-col sm:flex-row gap-6">
                    {order.payments && order.payments.length > 0 && (
                        <div className="flex-1">
                            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Payment History</h4>
                            <div className="space-y-2">
                                {order.payments.map(payment => (
                                    <div key={payment.id} className="flex justify-between items-center text-sm border-b pb-2">
                                        <div>
                                            <p className="font-medium">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                                    {payment.paymentMethod.replace('_', ' ')}
                                                </Badge>
                                                {payment.notes && <span className="text-xs text-muted-foreground">• {payment.notes}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-green-600 font-semibold">+ Rs. {parseFloat(payment.amount).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 flex flex-col justify-end items-end gap-3 mt-4 sm:mt-0">
                        {outstanding > 0 && order.orderStatus !== "CANCELLED" && (
                            <Button
                                className="w-full sm:w-auto"
                                onClick={() => setPaymentOrder(order)}
                            >
                                <Banknote className="mr-2 h-4 w-4" />
                                {t("recordPayment")}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Hidden Print Template */}
                <div style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: 0,
                    width: '148mm',
                    minHeight: '210mm',
                    background: '#fff'
                }}>
                    <InvoiceReceipt ref={printRef} order={printOrder} />
                </div>

                {paymentOrder && (
                    <CustomerPaymentDialog
                        open={!!paymentOrder}
                        onOpenChange={(val) => {
                            if (!val) setPaymentOrder(null);
                        }}
                        customerId={customer.id}
                        order={{
                            id: paymentOrder.id,
                            invoiceId: paymentOrder.invoiceId,
                            outstandingAmount: paymentOrder.outstandingAmount
                        }}
                        onSuccess={() => {
                            setPaymentOrder(null);
                            onPaymentSuccess();
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
}

export function CustomerDetailsClient({
    customerId,
    initialCustomer,
}: CustomerDetailsClientProps) {
    const router = useRouter();
    const t = useTranslations("customers");
    const [customer, setCustomer] = useState<CustomerDetail>(initialCustomer);

    // Provide a way to refresh client data after payments
    const fetchCustomer = useCallback(async () => {
        if (!customerId) return;
        try {
            const res = await fetch(`/api/customers/${customerId}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setCustomer(data);
        } catch (e) {
            console.error(e);
        }
    }, [customerId]);

    const totalPaid = parseFloat(customer.paidAmount || "0");
    const totalOutstanding = parseFloat(customer.outstandingAmount || "0");

    // Filter & Pagination States
    const [orders, setOrders] = useState<OrderDetail[]>([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch] = useDebounce(searchQuery, 350);
    const [dateRangeType, setDateRangeType] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const sentinelRef = useRef<HTMLDivElement>(null);
    const isFirstLoad = useRef(true);

    const fetchPage = useCallback(async (
        page: number,
        search: string,
        from: string,
        to: string
    ) => {
        if (!navigator.onLine) return { dataRows: [], hasMore: false, total: 0 };
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '10');
        if (search) params.set('search', search);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        
        const res = await fetch(`/api/customers/${customerId}/orders?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch orders');
        const json = await res.json();
        return {
            dataRows: json.data || [],
            hasMore: json.metadata?.hasMore || false,
            total: json.metadata?.totalRecords || 0
        };
    }, [customerId]);

    const loadFirstPage = useCallback(async (search: string, from: string, to: string, silent = false) => {
        if (!silent) setIsSearchLoading(true);
        setCurrentPage(1);
        setHasMore(false);

        try {
            const result = await fetchPage(1, search, from, to);
            setOrders(result.dataRows);
            setHasMore(result.hasMore);
            setTotalOrders(result.total);
            setCurrentPage(2);
        } catch (err) {
            console.error('Failed to load orders:', err);
        } finally {
            setIsSearchLoading(false);
        }
    }, [fetchPage]);

    useEffect(() => {
        loadFirstPage('', '', '').then(() => {
            isFirstLoad.current = false;
        });
    }, [customerId, loadFirstPage]);

    const prevSearch = useRef(debouncedSearch);
    const prevFrom = useRef(fromDate);
    const prevTo = useRef(toDate);

    useEffect(() => {
        if (isFirstLoad.current) return;
        if (prevSearch.current === debouncedSearch && prevFrom.current === fromDate && prevTo.current === toDate) return;
        prevSearch.current = debouncedSearch;
        prevFrom.current = fromDate;
        prevTo.current = toDate;
        loadFirstPage(debouncedSearch, fromDate, toDate);
    }, [debouncedSearch, fromDate, toDate, loadFirstPage]);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore || isSearchLoading || !navigator.onLine) return;
        setIsLoadingMore(true);
        try {
            const result = await fetchPage(currentPage, debouncedSearch, fromDate, toDate);
            setOrders(prev => [...prev, ...result.dataRows]);
            setHasMore(result.hasMore);
            setCurrentPage(prev => prev + 1);
        } catch (err) {
            console.error('Failed to load more:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, isSearchLoading, fetchPage, currentPage, debouncedSearch, fromDate, toDate]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) loadMore(); },
            { threshold: 0.1 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore]);

    const handlePaymentSuccess = () => {
        fetchCustomer();
        loadFirstPage(debouncedSearch, fromDate, toDate, false);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/customers')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        {customer.name}
                    </h2>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        {customer.phone}
                        {customer.cnic && ` • ${customer.cnic}`}
                        {customer.address && ` • ${customer.address}`}
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard
                    icon={<Receipt className="h-5 w-5 text-blue-500" />}
                    label={t("totalOrders")}
                    value={totalOrders.toString()}
                />
                <SummaryCard
                    icon={<Banknote className="h-5 w-5 text-green-500" />}
                    label={t("totalPaid")}
                    value={`Rs. ${totalPaid.toLocaleString()}`}
                    className="text-green-600"
                />
                <SummaryCard
                    icon={<CreditCard className="h-5 w-5 text-red-500" />}
                    label={t("totalOutstanding")}
                    value={`Rs. ${totalOutstanding.toLocaleString()}`}
                    className="text-red-600"
                />
            </div>

            <div className="mt-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        {t("transactionHistory")}
                    </h3>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by ID or product..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Select value={dateRangeType} onValueChange={(val) => {
                            setDateRangeType(val);
                            const today = new Date();
                            let f = "";
                            let tDate = "";
                            
                            const formatDate = (date: Date) => {
                                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                            };
                            
                            switch (val) {
                                case "today": {
                                    f = formatDate(today);
                                    tDate = f;
                                    break;
                                }
                                case "yesterday": {
                                    const y = new Date(); y.setDate(y.getDate() - 1);
                                    f = formatDate(y); tDate = formatDate(y);
                                    break;
                                }
                                case "last7days": {
                                    const prev = new Date(); prev.setDate(prev.getDate() - 7);
                                    f = formatDate(prev); tDate = formatDate(today);
                                    break;
                                }
                                case "last30days": {
                                    const prev = new Date(); prev.setDate(prev.getDate() - 30);
                                    f = formatDate(prev); tDate = formatDate(today);
                                    break;
                                }
                                case "thisMonth": {
                                    const first = new Date(today.getFullYear(), today.getMonth(), 1);
                                    f = formatDate(first); tDate = formatDate(today);
                                    break;
                                }
                                case "lastMonth": {
                                    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                                    const last = new Date(today.getFullYear(), today.getMonth(), 0);
                                    f = formatDate(first); tDate = formatDate(last);
                                    break;
                                }
                                case "thisYear": {
                                    const first = new Date(today.getFullYear(), 0, 1);
                                    f = formatDate(first); tDate = formatDate(today);
                                    break;
                                }
                                case "lastYear": {
                                    const first = new Date(today.getFullYear() - 1, 0, 1);
                                    const last = new Date(today.getFullYear() - 1, 11, 31);
                                    f = formatDate(first); tDate = formatDate(last);
                                    break;
                                }
                                case "all":
                                case "custom":
                                default:
                                    break;
                            }
                            
                            if (val !== "custom") {
                                setFromDate(f);
                                setToDate(tDate);
                            }
                        }}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Date Filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                <SelectItem value="last7days">Last 7 Days</SelectItem>
                                <SelectItem value="last30days">Last 30 Days</SelectItem>
                                <SelectItem value="thisMonth">This Month</SelectItem>
                                <SelectItem value="lastMonth">Last Month</SelectItem>
                                <SelectItem value="thisYear">This Year</SelectItem>
                                <SelectItem value="lastYear">Last Year</SelectItem>
                                <SelectItem value="custom">Custom Range</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        {dateRangeType === "custom" && (
                            <div className="flex flex-col sm:flex-row items-center gap-2">
                                <Input 
                                    type="date" 
                                    value={fromDate} 
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="max-w-[140px]"
                                />
                                <span className="text-sm text-muted-foreground">-</span>
                                <Input 
                                    type="date" 
                                    value={toDate} 
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="max-w-[140px]"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {isSearchLoading ? (
                    <div className="space-y-4 pt-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-[120px] w-full rounded-xl" />)}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-accent/30 rounded-lg border border-dashed">
                        {t("noTransactionsFound")}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <TransactionCard
                                key={order.id}
                                order={order}
                                customer={customer}
                                onPaymentSuccess={handlePaymentSuccess}
                            />
                        ))}
                    </div>
                )}
                
                {/* IntersectionObserver sentinel */}
                <div ref={sentinelRef} className="h-8" />
                
                {isLoadingMore && (
                    <div className="space-y-4">
                         <Skeleton className="h-[120px] w-full rounded-xl" />
                    </div>
                )}

                {!hasMore && orders.length > 0 && !isSearchLoading && (
                    <p className="text-center text-xs text-muted-foreground py-4">
                        Showing {orders.length} of {totalOrders} records
                    </p>
                )}
            </div>
        </div>
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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${className || ""}`}>{value}</div>
            </CardContent>
        </Card>
    );
}
