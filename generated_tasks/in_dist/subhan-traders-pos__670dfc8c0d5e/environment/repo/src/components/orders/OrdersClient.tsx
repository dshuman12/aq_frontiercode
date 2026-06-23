'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnlineStatus } from "@/hooks/use-offline-data";
import { cancelOrder } from "@/lib/actions/order.actions";
import { getPaginatedOfflineOrders } from "@/offline/offline-service";
import { format } from "date-fns";
import { Search, CloudOff, Edit, Eye, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { EditOrderDialog } from "./EditOrderDialog";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { OrderPaymentDialog } from "./OrderPaymentDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 20;

interface Order {
    id: string;
    invoiceId: string;
    createdAt: string;
    customerName: string | null;
    customerPhone: string | null;
    walkInCustomerName: string | null;
    items: any[];
    itemCount: number;
    subtotal: number;
    totalDiscount: number;
    totalPrice: number;
    paidAmount: number;
    outstandingAmount: number;
    paymentMethod: 'CASH' | 'CARD' | 'ONLINE_PAYMENT' | null;
    isWholesale: boolean;
    orderStatus: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'CANCELLED';
}

function ListRowSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
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

export function OrdersClient() {
    const isOnline = useOnlineStatus();
    const router = useRouter();
    const [pendingCancel, setPendingCancel] = useState<string | null>(null);
    const [isCancelling, startCancelTransition] = useTransition();
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRangeType, setDateRangeType] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const t = useTranslations("orders");
    const tc = useTranslations("common");
    
    // Filters and Debounce
    const [debouncedSearch] = useDebounce(searchQuery, 350);

    // Data State
    const [orders, setOrders] = useState<Order[]>([]);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isOffline, setIsOffline] = useState(false);

    const sentinelRef = useRef<HTMLDivElement>(null);
    const isFirstLoad = useRef(true);

    const fetchPage = useCallback(async (
        page: number,
        search: string,
        from: string,
        to: string
    ): Promise<{ orders: Order[]; hasMore: boolean; total: number }> => {
        if (!isOnline) {
            const { data, metadata } = await getPaginatedOfflineOrders({
                page,
                limit: PAGE_SIZE,
                search,
                from,
                to
            });
            const mappedOrders: Order[] = data.map(o => ({
                id: o.id,
                invoiceId: o.invoiceId,
                createdAt: o.createdAt,
                customerName: o.customerName || o.walkInCustomerName || null,
                customerPhone: o.customerPhone || null,
                walkInCustomerName: o.walkInCustomerName || null,
                items: o.items || [],
                itemCount: o.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
                subtotal: o.subtotal,
                totalDiscount: o.totalDiscount,
                totalPrice: o.totalPrice,
                paidAmount: o.paidAmount,
                outstandingAmount: o.outstandingAmount,
                paymentMethod: o.paymentMethod || null,
                isWholesale: o.isWholesale,
                orderStatus: o.orderStatus,
            }));
            return {
                orders: mappedOrders,
                hasMore: metadata.hasMore,
                total: metadata.totalRecords
            };
        }

        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', PAGE_SIZE.toString());
        if (search) params.set('search', search);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        params.set('_t', Date.now().toString());

        const res = await fetch(`/api/orders?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch orders');
        const json = await res.json();
        
        const mappedOrders: Order[] = (json.data || []).map((o: any) => ({
            id: o.id,
            invoiceId: o.invoiceId,
            createdAt: o.createdAt,
            customerName: o.customerName || o.walkInCustomerName || null,
            customerPhone: o.customerPhone || null,
            walkInCustomerName: o.walkInCustomerName || null,
            items: o.items || [],
            itemCount: o.items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) || 0,
            subtotal: parseFloat(o.subtotal || 0),
            totalDiscount: parseFloat(o.totalDiscount || 0),
            totalPrice: parseFloat(o.totalPrice),
            paidAmount: parseFloat(o.paidAmount || 0),
            outstandingAmount: parseFloat(o.outstandingAmount || 0),
            paymentMethod: o.paymentMethod || null,
            isWholesale: o.isWholesale || false,
            orderStatus: o.orderStatus,
        }));

        return {
            orders: mappedOrders,
            hasMore: json.metadata?.hasMore || false,
            total: json.metadata?.totalRecords || 0
        };
    }, [isOnline]);

    const loadFirstPage = useCallback(async (search: string, from: string, to: string, silent = false) => {
        if (!silent) setIsSearchLoading(true);
        setCurrentPage(1);
        setHasMore(false);

        try {
            setIsOffline(!isOnline);
            const result = await fetchPage(1, search, from, to);
            setOrders(result.orders);
            setHasMore(result.hasMore);
            setTotalItems(result.total);
            setCurrentPage(2);
        } catch (err) {
            console.error('Failed to load orders:', err);
        } finally {
            setIsSearchLoading(false);
        }
    }, [isOnline, fetchPage]);

    useEffect(() => {
        loadFirstPage('', '', '').then(() => {
            isFirstLoad.current = false;
        });
    }, []);

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
        if (isLoadingMore || !hasMore || isOffline || isSearchLoading) return;
        setIsLoadingMore(true);
        try {
            const result = await fetchPage(currentPage, debouncedSearch, fromDate, toDate);
            setOrders(prev => [...prev, ...result.orders]);
            setHasMore(result.hasMore);
            setCurrentPage(prev => prev + 1);
        } catch (err) {
            console.error('Failed to load more:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, isOffline, isSearchLoading, fetchPage, currentPage, debouncedSearch, fromDate, toDate]);

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

    const handleCancelOrder = (orderId: string) => {
        startCancelTransition(async () => {
            const result = await cancelOrder(orderId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(t("orderCancelledSuccess"));
                loadFirstPage(debouncedSearch, fromDate, toDate, true);
                router.refresh();
            }
            setPendingCancel(null);
        });
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'FULLY_PAID': return t("fullyPaid");
            case 'PARTIALLY_PAID': return t("partiallyPaid");
            case 'PENDING': return t("pending");
            case 'CANCELLED': return t("cancelled");
            default: return status;
        }
    };

    const refetch = () => loadFirstPage(debouncedSearch, fromDate, toDate, false);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-tight">{t("ordersHistory")}</h2>
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
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("searchPlaceholder") || "Search by ID, name or phone..."}
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

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("invoice")}</TableHead>
                            <TableHead>{t("date")}</TableHead>
                            <TableHead>{t("customer")}</TableHead>
                            <TableHead>{tc("items")}</TableHead>
                            <TableHead>{tc("total")}</TableHead>
                            <TableHead>{t("outstanding")}</TableHead>
                            <TableHead>{t("status")}</TableHead>
                            <TableHead className="text-right">{tc("actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isSearchLoading ? (
                            [...Array(PAGE_SIZE)].map((_, i) => <ListRowSkeleton key={`loading-${i}`} />)
                        ) : orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24">{t("noOrdersFound") || "No orders found"}</TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.invoiceId}</TableCell>
                                        <TableCell>{format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                                        <TableCell>{order.customerName || t("walkIn")}</TableCell>
                                        <TableCell>{order.itemCount} {tc("items")}</TableCell>
                                        <TableCell>Rs. {order.totalPrice.toLocaleString()}</TableCell>
                                        <TableCell>
                                            {order.outstandingAmount > 0 ? (
                                                <span className="font-medium text-orange-600 dark:text-orange-400">
                                                    Rs. {order.outstandingAmount.toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={order.orderStatus === 'FULLY_PAID' ? 'default' : order.orderStatus === 'CANCELLED' ? 'destructive' : 'secondary'}>
                                                {getStatusLabel(order.orderStatus)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <OrderDetailsDialog 
                                                    order={order} 
                                                    onPaymentSuccess={refetch}
                                                    trigger={
                                                        <Button variant="ghost" size="icon" title={t("viewDetails")}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                />
                                                
                                                {order.orderStatus !== 'CANCELLED' && (
                                                    <>
                                                        {order.outstandingAmount > 0 && (
                                                            <OrderPaymentDialog
                                                                orderId={order.id}
                                                                invoiceId={order.invoiceId}
                                                                outstandingAmount={order.outstandingAmount}
                                                                customerName={order.customerName}
                                                                onPaymentSuccess={refetch}
                                                            />
                                                        )}

                                                        <EditOrderDialog 
                                                            order={order} 
                                                            trigger={
                                                                <Button variant="ghost" size="icon" title={t("editOrder")}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            }
                                                        />

                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="text-destructive" title={t("cancelOrder")}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>{t("cancelOrder")}</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        {t("cancelOrderDescription")}
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>{t("keepOrder")}</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        onClick={() => handleCancelOrder(order.id)}
                                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                    >
                                                                        {isCancelling ? t("cancelling") : t("yesCancelOrder")}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {isLoadingMore && [...Array(4)].map((_, i) => <ListRowSkeleton key={`more-${i}`} />)}
                            </>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* IntersectionObserver sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* End-of-list message */}
            {!hasMore && !isSearchLoading && orders.length > 0 && (
                <p className="text-center text-xs text-muted-foreground pb-2">
                    {tc("showing")} {orders.length} {tc("of")} {totalItems} {tc("entries")}
                </p>
            )}
        </div>
    );
}
