"use client";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOffline } from "@/hooks/use-offline";
import { useScanDetection } from "@/hooks/use-scan-detection";
import { searchProducts } from "@/lib/actions/pos.actions";
import { getCategoryName, searchProductsOffline } from "@/offline/offline-service";
import { usePOSStore } from "@/store/use-pos-store";
import { Package, Search, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { CustomerSelector } from "./CustomerSelector";

const PAGE_SIZE = 12;

interface Product {
  id: string;
  productName: string;
  barcode: string | null;
  quantity: number;
  retailPrice: string | number;
  wholesalePrice: string | number | null;
  costPrice: string | number | null;
  imgUrl?: string | null;
  category?: { name: string } | null;
  categoryId?: string | null;
  categoryName?: string | null;
}

interface ProductSearchProps {
  onAddProduct?: (product: Product) => void;
  isWholesaleOverride?: boolean;
  hideCustomerSelector?: boolean;
}

export function ProductSearch({ onAddProduct, isWholesaleOverride, hideCustomerSelector }: ProductSearchProps) {
  const t = useTranslations("pos");
  const tInventory = useTranslations("inventory");

  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 400);

  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);

  const { addItem, isWholesale: storeIsWholesale } = usePOSStore();
  const { isOffline } = useOffline();
  const isWholesale = isWholesaleOverride ?? storeIsWholesale;

  // ─── Fetch page from server ───────────────────────────────────────────────
  const fetchPage = useCallback(
    async (q: string, pageOffset: number): Promise<{ products: Product[]; hasMore: boolean }> => {
      if (isOffline) {
        // Offline: fetch all locally (IndexedDB), simulate pagination client-side
        const all = await searchProductsOffline(q);
        const withNames = await Promise.all(
          all.map(async (item) => ({
            id: item.id,
            productName: item.productName,
            barcode: item.barcode,
            quantity: item.quantity,
            retailPrice: item.retailPrice,
            wholesalePrice: item.wholesalePrice,
            costPrice: item.costPrice,
            imgUrl: null,
            categoryName: await getCategoryName(item.categoryId),
          }))
        );
        const page = withNames.slice(pageOffset, pageOffset + PAGE_SIZE);
        return { products: page, hasMore: pageOffset + PAGE_SIZE < withNames.length };
      }
      try {
        return await searchProducts(q, pageOffset, PAGE_SIZE);
      } catch {
        return { products: [], hasMore: false };
      }
    },
    [isOffline]
  );

  // ─── Initial load / query change ─────────────────────────────────────────
  useEffect(() => {
    setIsInitialLoading(true);
    setProducts([]);
    setOffset(0);
    setHasMore(false);

    startTransition(async () => {
      const result = await fetchPage(debouncedQuery, 0);
      setProducts(result.products);
      setHasMore(result.hasMore);
      setOffset(PAGE_SIZE);
      setIsInitialLoading(false);
    });
  }, [debouncedQuery, fetchPage]);

  // ─── Load more on scroll ──────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const result = await fetchPage(debouncedQuery, offset);
    setProducts((prev) => [...prev, ...result.products]);
    setHasMore(result.hasMore);
    setOffset((prev) => prev + PAGE_SIZE);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, fetchPage, debouncedQuery, offset]);

  useEffect(() => {
    const sentinel = bottomRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // ─── Add product ──────────────────────────────────────────────────────────
  const handleAddProduct = useCallback(
    (product: Product) => {
      if (onAddProduct) { onAddProduct(product); return; }

      const retailPrice = typeof product.retailPrice === "string" ? parseFloat(product.retailPrice) : product.retailPrice;
      const wholesalePrice = product.wholesalePrice
        ? typeof product.wholesalePrice === "string" ? parseFloat(product.wholesalePrice) : product.wholesalePrice
        : null;
      const costPrice = product.costPrice
        ? typeof product.costPrice === "string" ? parseFloat(product.costPrice) : product.costPrice
        : null;

      addItem({
        itemId: product.id,
        productName: product.productName,
        categoryName: product.category?.name || product.categoryName || null,
        quantity: 1,
        retailPrice,
        wholesalePrice,
        costPrice,
        priceType: isWholesale ? "WHOLESALE" : "RETAIL",
        maxQuantity: product.quantity,
      });
      toast.success(`Added: ${product.productName}`);
    },
    [addItem, isWholesale, onAddProduct]
  );

  // ─── Barcode scanner ──────────────────────────────────────────────────────
  useScanDetection({
    onScan: async (barcode) => {
      const result = await searchProducts(barcode, 0, 5);
      const results = result.products;
      const exactMatch = results.find((p) => p.barcode === barcode);
      if (exactMatch) {
        handleAddProduct(exactMatch);
        toast.success(`Scanned: ${exactMatch.productName}`);
      } else if (results.length === 1) {
        handleAddProduct(results[0]);
        toast.success(`Scanned: ${results[0].productName}`);
      } else {
        toast.error(`Product not found for barcode: ${barcode}`);
      }
    },
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Search bar + count — sticky at top of scrollable column */}
      <div className="sticky -top-4 z-10 bg-background pt-4 pb-2 -mx-4 px-4 flex flex-col gap-3 border-b border-border/30">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={isOffline ? `${t("searchProducts")} (Offline)` : t("searchProducts")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`ps-10 h-11 text-base ${isOffline ? "border-yellow-500/50" : ""}`}
            autoFocus
          />
          {isOffline && (
            <WifiOff className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
          )}
        </div>

        {/* Customer selector + count row */}
        <div className="flex items-center justify-between px-0.5">
          {hideCustomerSelector ? <div /> : <CustomerSelector />}
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {isInitialLoading ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""}${hasMore ? "+" : ""}`}
            </p>
            {query && (
              <button className="text-xs text-primary hover:underline" onClick={() => setQuery("")}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="overflow-y-auto rounded-lg">
        {isInitialLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Package className="h-8 w-8 opacity-30" />
            <p className="text-sm">{tInventory("noProductsFound")}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-2">
              {products.map((product) => {
                const price =
                  isWholesale && product.wholesalePrice
                    ? typeof product.wholesalePrice === "string" ? parseFloat(product.wholesalePrice) : product.wholesalePrice
                    : typeof product.retailPrice === "string" ? parseFloat(product.retailPrice) : product.retailPrice;

                const outOfStock = product.quantity <= 0;

                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => handleAddProduct(product)}
                    className={`group relative flex flex-col rounded-xl border bg-card text-left transition-all
                      ${outOfStock
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:border-primary/50 hover:shadow-md hover:bg-accent/30 active:scale-[0.98]"
                      }`}
                  >
                    {/* Image */}
                    <div className="relative w-full aspect-[4/3] bg-muted rounded-t-xl overflow-hidden flex items-center justify-center">
                      {product.imgUrl ? (
                        <Image
                          src={product.imgUrl}
                          alt={product.productName}
                          fill
                          className="object-cover transition-transform duration-200 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, 200px"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                      )}
                      <span className={`absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        outOfStock ? "bg-red-500 text-white"
                          : product.quantity <= 5 ? "bg-amber-500 text-white"
                          : "bg-black/40 text-white backdrop-blur-sm"
                      }`}>
                        {outOfStock ? "Out" : product.quantity}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-2.5 flex flex-col gap-0.5">
                      <p className="text-xs font-semibold leading-tight line-clamp-2">{product.productName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {product.category?.name || product.categoryName || tInventory("uncategorized")}
                      </p>
                      <p className="text-sm font-bold text-primary mt-0.5">Rs. {price.toLocaleString()}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={bottomRef} className="h-4" />
            {isLoadingMore && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-0 pb-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
