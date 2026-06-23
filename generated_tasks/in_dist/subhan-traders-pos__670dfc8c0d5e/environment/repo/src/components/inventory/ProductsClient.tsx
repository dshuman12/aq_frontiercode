'use client';

import { BarcodeDialog } from "@/components/inventory/BarcodeDialog";
import { DeactivateProductDialog } from "@/components/inventory/DeactivateProductDialog";
import { EditProductDialog } from "@/components/inventory/EditProductDialog";
import { ProductForm } from "@/components/inventory/ProductForm";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOnlineStatus } from "@/hooks/use-offline-data";
import { getAllCategories, getAllItems } from "@/offline/offline-service";
import {
    Barcode,
    CloudOff,
    LayoutGrid,
    LayoutList,
    Package,
    Plus,
    RefreshCw,
    Search,
    X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

const PAGE_SIZE = 12;

interface Product {
    id: string;
    productName: string;
    categoryId: string | null;
    categoryName?: string;
    quantity: number;
    minStockLevel: number;
    retailPrice: number;
    wholesalePrice?: number | null;
    costPrice?: number | null;
    barcode: string | null;
    sku: string | null;
    priceType: "RETAIL" | "WHOLESALE";
    imgUrl?: string | null;
}

interface Category {
    id: string;
    name: string;
}

// ── Skeleton components ────────────────────────────────────────────────────────

function ListRowSkeleton() {
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-36" />
                </div>
            </TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-10" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </TableCell>
        </TableRow>
    );
}

function GridCardSkeleton() {
    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <Skeleton className="w-full aspect-[4/3]" />
            <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-between pt-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-8 rounded-full" />
                </div>
            </div>
            <div className="flex gap-1 px-2 pb-2 pt-1 border-t justify-end">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ProductsClient() {
    const isOnline = useOnlineStatus();
    const t = useTranslations("inventory");
    const tc = useTranslations("common");

    // ── View mode ──────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('products-view-mode') as 'list' | 'grid') || 'list';
        }
        return 'list';
    });

    const toggleViewMode = (mode: 'list' | 'grid') => {
        setViewMode(mode);
        localStorage.setItem('products-view-mode', mode);
    };

    // ── Filters (pure client-state, no URL) ────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryId, setCategoryId] = useState('ALL');
    const [debouncedSearch] = useDebounce(searchTerm, 350);

    // ── Data state ─────────────────────────────────────────────────────────────
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    /** True when filters changed — shows skeleton rows in-place */
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    /** True while fetching the next infinite-scroll page */
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isOffline, setIsOffline] = useState(false);

    // Image preview
    const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

    // Sentinel for IntersectionObserver
    const sentinelRef = useRef<HTMLDivElement>(null);
    // Track whether this is the first render or a filter-triggered reload
    const isFirstLoad = useRef(true);

    // ── API fetch helper ───────────────────────────────────────────────────────
    const fetchPage = useCallback(async (
        page: number,
        search: string,
        catId: string
    ): Promise<{ products: Product[]; categories: Category[]; hasMore: boolean; total: number }> => {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', PAGE_SIZE.toString());
        if (search) params.set('search', search);
        if (catId && catId !== 'ALL') params.set('categoryId', catId);
        params.set('_t', Date.now().toString());

        const res = await fetch(`/api/inventory/products?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch products');
        const json = await res.json();

        const mapped: Product[] = (json.data || []).map((p: any) => ({
            id: p.id,
            productName: p.productName,
            categoryId: p.categoryId || null,
            categoryName: p.category?.name || null,
            quantity: p.quantity,
            minStockLevel: p.minStockLevel,
            retailPrice: parseFloat(p.retailPrice),
            wholesalePrice: p.wholesalePrice ? parseFloat(p.wholesalePrice) : null,
            costPrice: p.costPrice ? parseFloat(p.costPrice) : null,
            barcode: p.barcode || null,
            sku: p.sku || null,
            priceType: p.priceType || 'RETAIL',
            imgUrl: p.imgUrl || null,
        }));

        const cats: Category[] = (json.categories || []).map((c: any) => ({ id: c.id, name: c.name }));
        const meta = json.meta || {};
        const total = meta.totalItems ?? mapped.length;
        const totalPages = meta.totalPages ?? 1;

        return { products: mapped, categories: cats, hasMore: page < totalPages, total };
    }, []);

    // ── Load first page (called on filter changes) ─────────────────────────────
    const loadFirstPage = useCallback(async (search: string, catId: string, silent = false) => {
        if (!silent) setIsSearchLoading(true);
        setCurrentPage(1);
        setHasMore(false);

        try {
            if (!isOnline) {
                const [offlineItems, offlineCats] = await Promise.all([getAllItems(), getAllCategories()]);
                setIsOffline(true);

                let filtered = offlineItems.map(item => ({
                    id: item.id,
                    productName: item.productName,
                    categoryId: item.categoryId,
                    categoryName: item.categoryName,
                    quantity: item.quantity,
                    minStockLevel: item.minStockLevel,
                    retailPrice: item.retailPrice,
                    wholesalePrice: item.wholesalePrice,
                    costPrice: item.costPrice,
                    barcode: item.barcode,
                    sku: item.sku,
                    priceType: item.priceType,
                    imgUrl: item.imgUrl,
                } as Product));

                if (search) {
                    const q = search.toLowerCase();
                    filtered = filtered.filter(p =>
                        p.productName.toLowerCase().includes(q) ||
                        (p.barcode?.includes(q) ?? false)
                    );
                }
                if (catId && catId !== 'ALL') {
                    filtered = filtered.filter(p => p.categoryId === catId);
                }

                setProducts(filtered);
                setCategories(offlineCats.map(c => ({ id: c.id, name: c.name })));
                setTotalItems(filtered.length);
                setHasMore(false);
            } else {
                setIsOffline(false);
                const result = await fetchPage(1, search, catId);
                setProducts(result.products);
                if (result.categories.length) setCategories(result.categories);
                setHasMore(result.hasMore);
                setTotalItems(result.total);
                setCurrentPage(2);
            }
        } catch (err) {
            console.error('Failed to load products:', err);
        } finally {
            setIsSearchLoading(false);
        }
    }, [isOnline, fetchPage]);

    // ── Boot: initial load ─────────────────────────────────────────────────────
    useEffect(() => {
        loadFirstPage('', 'ALL').then(() => {
            isFirstLoad.current = false;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── React to filter changes (search + category) ────────────────────────────
    // We delay until after boot so we don't double-fire on mount
    const prevSearch = useRef(debouncedSearch);
    const prevCat = useRef(categoryId);

    useEffect(() => {
        if (isFirstLoad.current) return;
        if (prevSearch.current === debouncedSearch && prevCat.current === categoryId) return;
        prevSearch.current = debouncedSearch;
        prevCat.current = categoryId;
        loadFirstPage(debouncedSearch, categoryId);
    }, [debouncedSearch, categoryId, loadFirstPage]);

    // ── Infinite scroll — load next pages ─────────────────────────────────────
    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore || isOffline || isSearchLoading) return;
        setIsLoadingMore(true);
        try {
            const result = await fetchPage(currentPage, debouncedSearch, categoryId);
            setProducts(prev => [...prev, ...result.products]);
            setHasMore(result.hasMore);
            setCurrentPage(prev => prev + 1);
        } catch (err) {
            console.error('Failed to load more:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, isOffline, isSearchLoading, fetchPage, currentPage, debouncedSearch, categoryId]);

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

    const clearFilters = () => {
        setSearchTerm('');
        setCategoryId('ALL');
    };

    const hasActiveFilters = Boolean(searchTerm || categoryId !== 'ALL');


    // ── Main render ────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-tight">{t("products")}</h2>
                    {isOffline && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <CloudOff className="h-3 w-3 mr-1" />
                            {tc("offlineData")}
                        </Badge>
                    )}
                    {!isSearchLoading && (
                        <span className="text-sm text-muted-foreground">
                            {products.length}{hasMore ? '+' : ''} / {totalItems}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => loadFirstPage(debouncedSearch, categoryId)}
                        disabled={!isOnline}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center border rounded-md overflow-hidden">
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="rounded-none h-9 w-9"
                            onClick={() => toggleViewMode('list')}
                            title="List view"
                        >
                            <LayoutList className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="rounded-none h-9 w-9"
                            onClick={() => toggleViewMode('grid')}
                            title="Grid view"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> {t("addProduct")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>{t("addNewProduct")}</DialogTitle>
                            </DialogHeader>
                            <ProductForm categories={categories} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("searchProducts")}
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder={tc("allCategories")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">{tc("allCategories")}</SelectItem>
                        {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {hasActiveFilters && (
                    <Button variant="ghost" size="icon" onClick={clearFilters} title={tc("clearFilters")}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* ── List View ──────────────────────────────────────────────────────── */}
            {viewMode === 'list' && (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{tc("name")}</TableHead>
                                <TableHead>{t("category")}</TableHead>
                                <TableHead>{tc("stock")}</TableHead>
                                <TableHead>{t("price")}</TableHead>
                                <TableHead>{t("barcode")}</TableHead>
                                <TableHead className="text-right">{tc("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isSearchLoading ? (
                                // Skeleton rows in-place while search is loading
                                [...Array(PAGE_SIZE)].map((_, i) => <ListRowSkeleton key={i} />)
                            ) : products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        {t("noProductsFound")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {products.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            product.imgUrl
                                                                ? setPreviewImage({ url: product.imgUrl, name: product.productName })
                                                                : undefined
                                                        }
                                                        className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted ${
                                                            product.imgUrl
                                                                ? 'cursor-pointer ring-offset-background transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2'
                                                                : 'cursor-default'
                                                        }`}
                                                    >
                                                        {product.imgUrl ? (
                                                            <Image
                                                                src={product.imgUrl}
                                                                alt={product.productName}
                                                                fill
                                                                className="object-cover"
                                                                sizes="36px"
                                                            />
                                                        ) : (
                                                            <Package className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </button>
                                                    <span>{product.productName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{product.categoryName || t("uncategorized")}</TableCell>
                                            <TableCell
                                                className={product.quantity <= product.minStockLevel ? "text-red-500 font-bold" : ""}
                                            >
                                                {product.quantity}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>Rs. {product.retailPrice}</span>
                                                    {product.wholesalePrice != null && (
                                                        <span className="text-xs text-muted-foreground">
                                                            W/S: Rs. {product.wholesalePrice}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {product.barcode ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Badge variant="outline" className="font-mono text-xs cursor-pointer">
                                                                    <Barcode className="h-3 w-3 mr-1" />
                                                                    {product.barcode.length > 12
                                                                        ? `${product.barcode.substring(0, 12)}...`
                                                                        : product.barcode}
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="font-mono">{product.barcode}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <EditProductDialog
                                                        product={product}
                                                        categories={categories}
                                                        onProductUpdated={() => loadFirstPage(debouncedSearch, categoryId)}
                                                    />
                                                    <BarcodeDialog
                                                        productId={product.id}
                                                        productName={product.productName}
                                                        currentBarcode={product.barcode}
                                                        price={product.retailPrice}
                                                        onBarcodeUpdated={() => loadFirstPage(debouncedSearch, categoryId)}
                                                    />
                                                    <StockAdjustmentDialog
                                                        itemId={product.id}
                                                        itemName={product.productName}
                                                    />
                                                    <DeactivateProductDialog
                                                        productId={product.id}
                                                        productName={product.productName}
                                                        onProductDeactivated={() => loadFirstPage(debouncedSearch, categoryId)}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Skeleton rows appended at bottom while loading more */}
                                    {isLoadingMore && [...Array(4)].map((_, i) => <ListRowSkeleton key={`more-${i}`} />)}
                                </>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* ── Grid View ──────────────────────────────────────────────────────── */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {isSearchLoading ? (
                        // Skeleton cards in-place while search loading
                        [...Array(PAGE_SIZE)].map((_, i) => <GridCardSkeleton key={i} />)
                    ) : products.length === 0 ? (
                        <div className="col-span-full flex items-center justify-center h-48 border rounded-md text-muted-foreground">
                            {t("noProductsFound")}
                        </div>
                    ) : (
                        <>
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className="group relative flex flex-col rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            product.imgUrl
                                                ? setPreviewImage({ url: product.imgUrl, name: product.productName })
                                                : undefined
                                        }
                                        className={`relative w-full aspect-[4/3] bg-muted flex items-center justify-center ${
                                            product.imgUrl ? 'cursor-pointer' : 'cursor-default'
                                        }`}
                                    >
                                        {product.imgUrl ? (
                                            <Image
                                                src={product.imgUrl}
                                                alt={product.productName}
                                                fill
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                                            />
                                        ) : (
                                            <Package className="h-10 w-10 text-muted-foreground/40" />
                                        )}
                                        {product.quantity <= product.minStockLevel && (
                                            <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                Low Stock
                                            </span>
                                        )}
                                    </button>

                                    <div className="flex flex-col gap-0.5 p-3">
                                        <p className="font-semibold text-sm leading-tight line-clamp-1">{product.productName}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {product.categoryName || t("uncategorized")}
                                        </p>
                                        <div className="flex items-center justify-between mt-1.5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-primary">
                                                    Rs. {product.retailPrice.toLocaleString()}
                                                </span>
                                                {product.wholesalePrice != null && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        W/S: Rs. {product.wholesalePrice.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <span
                                                className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                                    product.quantity <= product.minStockLevel
                                                        ? 'bg-red-500/10 text-red-500'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {product.quantity}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end flex-wrap gap-0.5 px-2 pb-2 border-t pt-1.5">
                                        <EditProductDialog
                                            product={product}
                                            categories={categories}
                                            onProductUpdated={() => loadFirstPage(debouncedSearch, categoryId)}
                                        />
                                        <BarcodeDialog
                                            productId={product.id}
                                            productName={product.productName}
                                            currentBarcode={product.barcode}
                                            price={product.retailPrice}
                                            onBarcodeUpdated={() => loadFirstPage(debouncedSearch, categoryId)}
                                        />
                                        <StockAdjustmentDialog itemId={product.id} itemName={product.productName} />
                                        <DeactivateProductDialog
                                            productId={product.id}
                                            productName={product.productName}
                                            onProductDeactivated={() => loadFirstPage(debouncedSearch, categoryId)}
                                        />
                                    </div>
                                </div>
                            ))}
                            {/* Skeleton cards appended at bottom while loading more */}
                            {isLoadingMore && [...Array(4)].map((_, i) => <GridCardSkeleton key={`more-${i}`} />)}
                        </>
                    )}
                </div>
            )}

            {/* IntersectionObserver sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* End-of-list message */}
            {!hasMore && !isSearchLoading && products.length > 0 && (
                <p className="text-center text-xs text-muted-foreground pb-2">
                    {tc("showing")} {products.length} {tc("of")} {totalItems} {tc("entries")}
                </p>
            )}

            {/* Image Preview Dialog */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-4 pb-0">
                        <DialogTitle>{previewImage?.name}</DialogTitle>
                    </DialogHeader>
                    {previewImage && (
                        <div className="relative w-full aspect-square max-h-[70vh]">
                            <Image
                                src={previewImage.url}
                                alt={previewImage.name}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 100vw, 672px"
                                priority
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
