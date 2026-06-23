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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { deletePurchaseOrder } from "@/lib/actions/supplier.actions";
import { format } from "date-fns";
import {
    ArrowLeft,
    Banknote,
    CloudOff,
    CreditCard,
    MapPin,
    Phone,
    Plus,
    Receipt,
    RefreshCw,
    Search,
    ShoppingBag
} from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { EditPurchaseOrderDialog } from "./EditPurchaseOrderDialog";
import { SupplierPaymentDialog } from "./SupplierPaymentDialog";

import { CreatePurchaseDialog } from "./CreatePurchaseDialog";
import {
    PurchaseOrder,
    PurchaseOrderCard,
    PurchaseOrderPayment
} from "./PurchaseOrderCard";

interface Supplier {
    id: string;
    name: string;
    phone: string;
    address: string | null;
    totalAmount: string;
    amountPaid: string;
    remainingAmount: string;
}

interface Props {
    supplierId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SupplierDetailClient({ supplierId }: Props) {
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Filter & Pagination States
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
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

    // Dialog states
    const [paymentPO, setPaymentPO] = useState<PurchaseOrder | null>(null);
    const [editPO, setEditPO] = useState<PurchaseOrder | null>(null);
    const [deletePO, setDeletePO] = useState<PurchaseOrder | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const [printPayment, setPrintPayment] = useState<{ payment: PurchaseOrderPayment; po: PurchaseOrder } | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();

    const fetchSupplier = async () => {
        setIsLoading(true);
        setError(null);

        if (!navigator.onLine) {
            setIsOffline(true);
            try {
                const { getSupplierById } = await import('@/offline/offline-service');
                const offlineData = await getSupplierById(supplierId);
                if (offlineData) {
                   setSupplier({
                       id: offlineData.id,
                       name: offlineData.name,
                       phone: offlineData.phone,
                       address: offlineData.address || null,
                       totalAmount: String(offlineData.totalAmount),
                       amountPaid: String(offlineData.amountPaid),
                       remainingAmount: String(offlineData.remainingAmount)
                   });
                } else {
                   setError('Supplier not found locally while offline');
                }
            } catch (err) {
                setError('Failed to load supplier details offline');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        try {
            const res = await fetch(`/api/suppliers/${supplierId}`);
            if (!res.ok) {
                if (res.status === 404) {
                    setError('Supplier not found');
                } else {
                    throw new Error('Failed to fetch supplier');
                }
                return;
            }
            const data = await res.json();
            setSupplier(data);
            setIsOffline(false);
        } catch (err) {
            setError('Failed to load supplier details');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPage = useCallback(async (
        page: number,
        search: string,
        from: string,
        to: string
    ) => {
        if (!navigator.onLine) {
            const { getPaginatedOfflinePurchaseOrders } = await import('@/offline/offline-service');
            const result = await getPaginatedOfflinePurchaseOrders(supplierId, page, 10, search, from, to);
            return {
                pos: result.data || [],
                hasMore: result.metadata?.hasMore || false,
                total: result.metadata?.totalRecords || 0
            };
        }

        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '10');
        if (search) params.set('search', search);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        
        const res = await fetch(`/api/suppliers/${supplierId}/purchases?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch purchases');
        const json = await res.json();
        return {
            pos: json.data || [],
            hasMore: json.metadata?.hasMore || false,
            total: json.metadata?.totalRecords || 0
        };
    }, [supplierId]);

    const loadFirstPage = useCallback(async (search: string, from: string, to: string, silent = false) => {
        if (!silent) setIsSearchLoading(true);
        setCurrentPage(1);
        setHasMore(false);

        try {
            const result = await fetchPage(1, search, from, to);
            setPurchaseOrders(result.pos);
            setHasMore(result.hasMore);
            setTotalOrders(result.total);
            setCurrentPage(2);
        } catch (err) {
            console.error('Failed to load purchases:', err);
        } finally {
            setIsSearchLoading(false);
        }
    }, [fetchPage]);

    useEffect(() => {
        fetchSupplier();
        loadFirstPage('', '', '').then(() => {
            isFirstLoad.current = false;
        });
    }, [supplierId]);

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
            setPurchaseOrders(prev => [...prev, ...result.pos]);
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

    const handleRefresh = () => {
        fetchSupplier();
        loadFirstPage(debouncedSearch, fromDate, toDate, false);
    };

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const handleDeletePO = () => {
        if (!deletePO) return;
        startDeleteTransition(async () => {
            const result = await deletePurchaseOrder(deletePO.id);
            if (result.success) {
                toast.success("Purchase order deleted, stock reversed");
                setDeletePO(null);
                handleRefresh();
            } else {
                toast.error(result.error || "Failed to delete");
            }
        });
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: 'Supplier-Payment-Receipt',
    });

    const handlePrintPayment = useCallback((payment: PurchaseOrderPayment, po: PurchaseOrder) => {
        setPrintPayment({ payment, po });
        // Allow React to render the receipt before printing
        setTimeout(() => handlePrint(), 300);
    }, [handlePrint]);

    // ─── Loading state ───────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    // ─── Error state ─────────────────────────────────────────────────────────

    if (error || !supplier) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <p className="text-lg text-muted-foreground">{error || 'Supplier not found'}</p>
                <Button asChild variant="outline">
                    <Link href="/inventory/suppliers">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Suppliers
                    </Link>
                </Button>
            </div>
        );
    }

    const totalPurchases = parseFloat(supplier.totalAmount || '0');
    const totalPaid = parseFloat(supplier.amountPaid || '0');
    const balanceDue = parseFloat(supplier.remainingAmount || '0');

    return (
        <>
            <div className="space-y-6">
                {/* ─── Header ─────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/inventory/suppliers">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
                                {isOffline && (
                                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                        <CloudOff className="h-3 w-3 mr-1" />
                                        Offline Data
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                    <Phone className="h-4 w-4" />
                                    {supplier.phone}
                                </span>
                                {supplier.address && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        {supplier.address}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handleRefresh}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <CreatePurchaseDialog 
                            suppliers={[supplier]}
                            trigger={
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Record Purchase
                                </Button>
                            }
                        />
                    </div>
                </div>

                {/* ─── Summary Cards ──────────────────────────────────────────── */}
                <div className="grid gap-4 md:grid-cols-4">
                    <SummaryCard
                        icon={<ShoppingBag className="h-4 w-4 text-blue-500" />}
                        label="Total Orders"
                        value={totalOrders.toString()}
                    />
                    <SummaryCard
                        icon={<Receipt className="h-4 w-4 text-purple-500" />}
                        label="Total Purchases"
                        value={`Rs. ${totalPurchases.toLocaleString()}`}
                    />
                    <SummaryCard
                        icon={<Banknote className="h-4 w-4 text-green-500" />}
                        label="Amount Paid"
                        value={`Rs. ${totalPaid.toLocaleString()}`}
                        className="text-green-600"
                    />
                    <SummaryCard
                        icon={<CreditCard className="h-4 w-4 text-red-500" />}
                        label="Balance Due"
                        value={`Rs. ${balanceDue.toLocaleString()}`}
                        className={balanceDue > 0 ? "text-red-600" : "text-green-600"}
                        highlight={balanceDue > 0}
                    />
                </div>

                <div className="mt-8 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            Transaction History
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
                    ) : purchaseOrders.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-accent/30 rounded-lg border border-dashed">
                            No purchase orders found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {purchaseOrders.map((po) => (
                                <PurchaseOrderCard
                                    key={po.id}
                                    po={po}
                                    supplier={supplier}
                                    onPayment={setPaymentPO}
                                    onEdit={setEditPO}
                                    onDelete={setDeletePO}
                                    onPrintPayment={handlePrintPayment}
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

                    {!hasMore && purchaseOrders.length > 0 && !isSearchLoading && (
                        <p className="text-center text-xs text-muted-foreground py-4">
                            Showing {purchaseOrders.length} of {totalOrders} records
                        </p>
                    )}
                </div>
            </div>

            {/* ─── Payment Dialog ──────────────────────────────────────────── */}
            {paymentPO && supplier && (
                <SupplierPaymentDialog
                    open={!!paymentPO}
                    onOpenChange={(val) => { if (!val) setPaymentPO(null); }}
                    supplierId={supplier.id}
                    purchaseOrder={paymentPO}
                    onSuccess={() => {
                        setPaymentPO(null);
                        handleRefresh();
                    }}
                />
            )}

            {/* ─── Edit Dialog ────────────────────────────────────────────── */}
            {editPO && (
                <EditPurchaseOrderDialog
                    open={!!editPO}
                    onOpenChange={(val) => { if (!val) setEditPO(null); }}
                    purchaseOrder={editPO}
                    onSuccess={() => {
                        setEditPO(null);
                        handleRefresh();
                    }}
                />
            )}

            {/* ─── Delete Confirmation ────────────────────────────────────── */}
            <AlertDialog open={!!deletePO} onOpenChange={(val) => { if (!val) setDeletePO(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this purchase order
                            {deletePO && (
                                <span className="font-medium">
                                    {" "}(Rs. {parseFloat(deletePO.totalAmount).toLocaleString()} — {deletePO.items.length} items)
                                </span>
                            )}.
                            <br /><br />
                            <span className="text-destructive font-medium">
                                ⚠️ Stock quantities will be reversed and supplier balance will be adjusted.
                            </span>
                            <br />
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeletePO}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete Purchase Order"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ─── Hidden Print Receipt ──────────────────────────────────── */}
            {printPayment && supplier && (
                <div style={{ 
                    position: 'fixed', 
                    left: '-9999px', 
                    top: 0,
                    width: '148mm',
                    minHeight: '210mm',
                    background: '#fff'
                }}>
                <div
                    ref={printRef}
                    className="print-content bg-white text-black"
                    style={{
                        fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
                        fontSize: '12px',
                        lineHeight: '1.4',
                        color: '#000',
                        backgroundColor: '#fff',
                        width: '148mm',
                        minHeight: '210mm',
                        padding: '4mm',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Header with Logo and Company Info */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '4mm',
                        borderBottom: '2px solid #000',
                        paddingBottom: '3mm'
                    }}>
                        {/* Logo Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1mm' }}>
                            <img
                                src="/logo.png"
                                alt="Subhan Traders"
                                style={{
                                    width: '35mm',
                                    height: 'auto',
                                    objectFit: 'contain'
                                }}
                            />
                            <p style={{ fontSize: '8px', margin: 0, color: '#000', fontStyle: 'italic', textAlign: 'center', maxWidth: '38mm' }}>
                                Imported Bicycles &amp; Kids Items
                            </p>
                        </div>

                        {/* Company Details */}
                        <div style={{ textAlign: 'right' }}>
                            <h1 style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                margin: 0,
                                color: '#000'
                            }}>
                                Subhan Traders
                            </h1>
                            <p style={{ fontSize: '10px', margin: '0.5mm 0', color: '#000' }}>
                                GT Road, Jalawanan, Batkhela
                            </p>
                            <p style={{ fontSize: '10px', margin: '0.3mm 0 0 0', color: '#000' }}>
                                Fazli Subhan Khan: 0333-9479744
                            </p>
                            <p style={{ fontSize: '10px', margin: '0.3mm 0 0 0', color: '#000' }}>
                                Aziz Muhammad: 0345-9168430
                            </p>
                        </div>
                    </div>

                    {/* Supplier Info & Receipt Details */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '3mm',
                        fontSize: '11px',
                        color: '#000'
                    }}>
                        {/* Paid To */}
                        <div>
                            <p style={{ fontWeight: '700', margin: '0 0 0.5mm 0', color: '#000', fontSize: '11px', textDecoration: 'underline' }}>PAID TO</p>
                            <p style={{ margin: '0.3mm 0' }}><span style={{ fontWeight: '600' }}>Supplier:</span> {supplier.name}</p>
                            <p style={{ margin: '0.3mm 0' }}><span style={{ fontWeight: '600' }}>Phone:</span> {supplier.phone}</p>
                            {supplier.address && (
                                <p style={{ margin: '0.3mm 0' }}><span style={{ fontWeight: '600' }}>Address:</span> {supplier.address}</p>
                            )}
                        </div>

                        {/* Receipt Details */}
                        <div style={{ textAlign: 'right' }}>
                            <table style={{ marginLeft: 'auto', borderCollapse: 'collapse', fontSize: '11px' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '0.3mm 1.5mm', textAlign: 'left', fontWeight: '600' }}>Date:</td>
                                        <td style={{ padding: '0.3mm 0', textAlign: 'right' }}>{format(new Date(printPayment.payment.paymentDate), 'MMM d, yyyy')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '0.3mm 1.5mm', textAlign: 'left', fontWeight: '600' }}>Time:</td>
                                        <td style={{ padding: '0.3mm 0', textAlign: 'right' }}>{format(new Date(printPayment.payment.paymentDate), 'h:mm a')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '0.3mm 1.5mm', textAlign: 'left', fontWeight: '600' }}>Payment:</td>
                                        <td style={{ padding: '0.3mm 0', textAlign: 'right' }}>{printPayment.payment.paymentMethod.replace('_', ' ')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '0.3mm 1.5mm', textAlign: 'left', fontWeight: '600' }}>PO Date:</td>
                                        <td style={{ padding: '0.3mm 0', textAlign: 'right' }}>{format(new Date(printPayment.po.purchaseDate), 'MMM d, yyyy')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Payment Details Table */}
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        marginBottom: '2mm',
                        fontSize: '11px'
                    }}>
                        <thead>
                            <tr style={{
                                borderTop: '2px solid #000',
                                borderBottom: '2px solid #000'
                            }}>
                                <th style={{ padding: '1mm', textAlign: 'left', width: '35%', fontWeight: 'bold' }}>Description</th>
                                <th style={{ padding: '1mm', textAlign: 'left', width: '25%', fontWeight: 'bold' }}>Method</th>
                                <th style={{ padding: '1mm', textAlign: 'left', width: '20%', fontWeight: 'bold' }}>Reference</th>
                                <th style={{ padding: '1mm', textAlign: 'right', width: '20%', fontWeight: 'bold' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #000' }}>
                                <td style={{ padding: '0.8mm 1mm' }}>Supplier Payment</td>
                                <td style={{ padding: '0.8mm 1mm' }}>{printPayment.payment.paymentMethod.replace('_', ' ')}</td>
                                <td style={{ padding: '0.8mm 1mm' }}>{printPayment.payment.notes || '—'}</td>
                                <td style={{ padding: '0.8mm 1mm', textAlign: 'right', fontWeight: '600' }}>Rs. {parseFloat(printPayment.payment.amount).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Purchase Order Items */}
                    {printPayment.po.items && printPayment.po.items.length > 0 && (
                        <>
                            <p style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                margin: '3mm 0 0mm 0',
                                color: '#000',
                                
                                paddingBottom: '1mm'
                            }}>
                                PURCHASE ORDER ITEMS
                            </p>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                marginBottom: '2mm',
                                fontSize: '10px'
                            }}>
                                <thead>
                                    <tr style={{
                                        borderTop: '2px solid #000',
                                        borderBottom: '2px solid #000'
                                    }}>
                                        <th style={{ padding: '0.8mm 1mm', textAlign: 'left', fontWeight: 'bold' }}>Product</th>
                                        <th style={{ padding: '0.8mm 1mm', textAlign: 'right', fontWeight: 'bold' }}>Unit Cost</th>
                                        <th style={{ padding: '0.8mm 1mm', textAlign: 'center', fontWeight: 'bold' }}>Qty</th>
                                        <th style={{ padding: '0.8mm 1mm', textAlign: 'right', fontWeight: 'bold' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {printPayment.po.items.map((item, idx) => (
                                        <tr key={item.id} style={{
                                            borderBottom: idx < printPayment.po.items.length - 1 ? '0.5px solid #000' : '1.5px solid #000'
                                        }}>
                                            <td style={{ padding: '0.6mm 1mm' }}>{item.productNameSnapshot}</td>
                                            <td style={{ padding: '0.6mm 1mm', textAlign: 'right' }}>Rs. {parseFloat(item.purchasePrice).toLocaleString()}</td>
                                            <td style={{ padding: '0.6mm 1mm', textAlign: 'center' }}>{item.quantity}</td>
                                            <td style={{ padding: '0.6mm 1mm', textAlign: 'right' }}>Rs. {parseFloat(item.itemTotal).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* Totals Section */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: '2mm'
                    }}>
                        <table style={{
                            borderCollapse: 'collapse',
                            fontSize: '11px',
                            minWidth: '40%'
                        }}>
                            <tbody>
                                <tr style={{ fontWeight: 'bold', fontSize: '12px' }}>
                                    <td style={{ padding: '0.8mm 2mm', textAlign: 'right' }}>Amount Paid:</td>
                                    <td style={{ padding: '0.8mm 0', textAlign: 'right', minWidth: '22mm' }}>Rs. {parseFloat(printPayment.payment.amount).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.4mm 2mm', textAlign: 'right' }}>PO Total:</td>
                                    <td style={{ padding: '0.4mm 0', textAlign: 'right' }}>Rs. {parseFloat(printPayment.po.totalAmount).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.4mm 2mm', textAlign: 'right' }}>Total Paid:</td>
                                    <td style={{ padding: '0.4mm 0', textAlign: 'right' }}>Rs. {parseFloat(printPayment.po.paidAmount).toLocaleString()}</td>
                                </tr>
                                <tr style={{ fontWeight: 'bold', borderTop: '1px solid #000' }}>
                                    <td style={{ padding: '0.4mm 2mm', textAlign: 'right' }}>Balance Due:</td>
                                    <td style={{ padding: '0.4mm 0', textAlign: 'right' }}>Rs. {parseFloat(printPayment.po.remainingAmount).toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div style={{
                        textAlign: 'center',
                        paddingTop: '2mm',
                        borderTop: '1px solid #000'
                    }}>
                        <p style={{ fontSize: '11px', fontWeight: 'bold', margin: 0, color: '#000' }}>
                            Thank You for Your Business!
                        </p>
                        <p style={{ fontSize: '8px', margin: '1mm 0 0 0', color: '#000' }}>
                            Printed on {format(new Date(), 'MMM d, yyyy — h:mm a')}
                        </p>
                    </div>

                    {/* Print-specific styles */}
                    <style jsx global>{`
                        @media print {
                            .print-content {
                                width: 148mm !important;
                                min-height: 210mm !important;
                                padding: 4mm !important;
                                margin: 0 !important;
                                box-shadow: none !important;
                            }
                        }
                    `}</style>
                </div>
                </div>
            )}
        </>
    );
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({
    icon,
    label,
    value,
    className,
    highlight,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    className?: string;
    highlight?: boolean;
}) {
    return (
        <div className={`rounded-lg border bg-card p-4 ${highlight ? 'border-red-200 dark:border-red-900' : ''}`}>
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
