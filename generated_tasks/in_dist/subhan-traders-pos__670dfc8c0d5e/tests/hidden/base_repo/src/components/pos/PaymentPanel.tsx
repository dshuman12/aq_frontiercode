"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useOffline } from "@/hooks/use-offline";
import { createSale } from "@/lib/actions/pos.actions";
import { OfflineOrder } from "@/offline/db";
import { createOfflineOrder, getPendingSyncCount } from "@/offline/offline-service";
import { syncManager } from "@/offline/sync-manager";
import { usePOSStore } from "@/store/use-pos-store";
import {
  Cloud,
  CloudOff,
  CreditCard,
  Loader2,
  Printer,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Wallet,
  WifiOff,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { InvoiceReceipt } from "./InvoiceReceipt";

export function PaymentPanel() {
  const t = useTranslations("pos");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<OfflineOrder | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice-${lastInvoiceId || "receipt"}`,
  });

  const { isOffline } = useOffline();

  const {
    items,
    customer,
    walkInCustomer,
    isWholesale,
    paymentMethod,
    amountPaid,
    setIsWholesale,
    setPaymentMethod,
    setAmountPaid,
    clearCart,
  } = usePOSStore();

  const subtotal = items.reduce((acc, item) => acc + item.appliedPrice * item.quantity, 0);
  const totalDiscount = items.reduce((acc, item) => acc + item.discount, 0);
  const total = subtotal - totalDiscount;
  const totalProfit = items.reduce((acc, item) => {
    const costPrice = item.costPrice || 0;
    const profit = (item.appliedPrice - costPrice) * item.quantity - item.discount;
    return acc + profit;
  }, 0);

  const outstanding = Math.max(0, total - amountPaid);
  const change = amountPaid > total ? amountPaid - total : 0;
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  // Pending sync count
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await getPendingSyncCount();
      setPendingSyncCount(count);
    };
    updatePendingCount();
    const unsubComplete = syncManager.on("sync-complete", updatePendingCount);
    const unsubStart = syncManager.on("sync-start", () => setIsSyncing(true));
    const unsubEnd = syncManager.on("sync-complete", () => setIsSyncing(false));
    return () => {
      unsubComplete();
      unsubStart();
      unsubEnd();
    };
  }, []);

  const handleQuickPay = () => {
    setAmountPaid(total);
  };

  const handleCompleteSale = () => {
    if (items.length === 0) {
      toast.error(t("noItemsInCart"));
      return;
    }

    startTransition(async () => {
      const saleData = {
        items: items.map((item) => ({
          itemId: item.itemId,
          productName: item.productName,
          categoryName: item.categoryName,
          quantity: item.quantity,
          appliedPrice: item.appliedPrice,
          costPrice: item.costPrice,
          discount: item.discount,
          priceType: item.priceType,
        })),
        customerId: customer?.id || null,
        walkInCustomer: walkInCustomer,
        isWholesale,
        paymentMethod,
        amountPaid,
        subtotal,
        totalDiscount,
        total,
        totalProfit,
      };

      const buildOrderForPrint = (invoiceId: string): OfflineOrder => ({
        id: crypto.randomUUID(),
        invoiceId,
        customerId: saleData.customerId,
        customerName: customer?.name || null,
        customerPhone: customer?.phone || walkInCustomer?.phone || null,
        walkInCustomerName: saleData.walkInCustomer?.name || null,
        subtotal: saleData.subtotal,
        totalDiscount: saleData.totalDiscount,
        totalPrice: saleData.total,
        totalProfit: saleData.totalProfit,
        paidAmount: saleData.amountPaid,
        outstandingAmount: Math.max(0, saleData.total - saleData.amountPaid),
        paymentMethod: saleData.paymentMethod,
        orderStatus:
          saleData.amountPaid >= saleData.total
            ? "FULLY_PAID"
            : saleData.amountPaid > 0
            ? "PARTIALLY_PAID"
            : "PENDING",
        isWholesale: saleData.isWholesale,
        createdAt: new Date().toISOString(),
        items: saleData.items.map((item, idx) => ({
          id: `item-${idx}`,
          orderId: "",
          itemId: item.itemId,
          productNameSnapshot: item.productName,
          quantity: item.quantity,
          priceType: item.priceType,
          appliedPrice: item.appliedPrice,
          discountAmount: item.discount,
          itemTotal: item.appliedPrice * item.quantity - item.discount,
        })),
        synced: false,
      });

      const onSuccess = (invoiceId: string, offline = false) => {
        const suffix = offline ? " (Offline)" : "";
        toast.success(`${t("saleCompleted")} ${invoiceId}${suffix}`, {
          ...(offline && {
            description: "Will sync when online",
            icon: <CloudOff className="h-4 w-4" />,
          }),
        });
        setLastInvoiceId(invoiceId);
        setLastOrder(buildOrderForPrint(invoiceId));
        clearCart();
        if (!offline) router.refresh();
        if (offline) setPendingSyncCount((prev) => prev + 1);
      };

      if (isOffline) {
        const result = await createOfflineOrder(saleData);
        if (result.success && result.invoiceId) {
          onSuccess(result.invoiceId, true);
        } else {
          toast.error(result.error || "Failed to create offline sale");
        }
      } else {
        try {
          const result = await createSale(saleData);
          if (result.success && result.invoiceId) {
            onSuccess(result.invoiceId);
          } else {
            const offlineResult = await createOfflineOrder(saleData);
            if (offlineResult.success && offlineResult.invoiceId) {
              onSuccess(offlineResult.invoiceId, true);
            } else {
              toast.error(offlineResult.error || "Failed to create sale");
            }
          }
        } catch {
          const offlineResult = await createOfflineOrder(saleData);
          if (offlineResult.success && offlineResult.invoiceId) {
            onSuccess(offlineResult.invoiceId, true);
          } else {
            toast.error(offlineResult.error || "Failed to create sale");
          }
        }
      }
    });
  };

  const handleManualSync = async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    await syncManager.pushChanges();
    setIsSyncing(false);
    const count = await getPendingSyncCount();
    setPendingSyncCount(count);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Wholesale toggle + sync */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="wholesale"
              checked={isWholesale}
              onCheckedChange={setIsWholesale}
              className="scale-90"
            />
            <Label htmlFor="wholesale" className="text-xs cursor-pointer">
              {t("wholesalePrice")}
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            {pendingSyncCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-yellow-600 hover:text-yellow-700 px-1.5"
                onClick={handleManualSync}
                disabled={isSyncing || isOffline}
              >
                {isSyncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <CloudOff className="h-3 w-3" />
                )}
                <span className="text-[10px]">{pendingSyncCount}</span>
              </Button>
            )}
            {isOffline ? (
              <WifiOff className="h-3.5 w-3.5 text-yellow-500" />
            ) : pendingSyncCount === 0 ? (
              <Cloud className="h-3.5 w-3.5 text-green-500" />
            ) : null}
          </div>
        </div>

        {/* Payment Method — inline buttons */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{t("paymentMethod")}</Label>
          <RadioGroup
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
            className="grid grid-cols-3 gap-1.5"
          >
            <div className="flex items-center">
              <RadioGroupItem value="CASH" id="pm-cash" className="peer sr-only" />
              <Label
                htmlFor="pm-cash"
                className="flex items-center justify-center gap-1.5 rounded-md border-2 border-muted bg-popover py-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer w-full"
              >
                <Wallet className="h-3.5 w-3.5" />
                <span className="text-xs">{t("cash")}</span>
              </Label>
            </div>
            <div className="flex items-center">
              <RadioGroupItem value="CARD" id="pm-card" className="peer sr-only" />
              <Label
                htmlFor="pm-card"
                className="flex items-center justify-center gap-1.5 rounded-md border-2 border-muted bg-popover py-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer w-full"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span className="text-xs">{t("card")}</span>
              </Label>
            </div>
            <div className="flex items-center">
              <RadioGroupItem value="ONLINE_PAYMENT" id="pm-online" className="peer sr-only" />
              <Label
                htmlFor="pm-online"
                className="flex items-center justify-center gap-1.5 rounded-md border-2 border-muted bg-popover py-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer w-full"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span className="text-xs">{t("online")}</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Summary */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span className="font-medium">Rs. {subtotal.toLocaleString()}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("discount")}</span>
              <span className="text-destructive font-medium">
                - Rs. {totalDiscount.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold">
            <span>{t("total")}</span>
            <span className="text-primary">Rs. {total.toLocaleString()}</span>
          </div>
        </div>

        <Separator />

        {/* Amount received */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="inline-amount" className="text-xs">
              {t("amountReceived")}
            </Label>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={handleQuickPay}
            >
              {t("payFull")}
            </Button>
          </div>
          <div className="relative">
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
              Rs.
            </span>
            <Input
              id="inline-amount"
              type="number"
              value={amountPaid || ""}
              onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
              className="ps-9 h-9 text-sm font-medium"
              placeholder="0"
            />
          </div>
          {change > 0 && (
            <p className="text-[11px] text-emerald-500 font-medium">
              {t("change")}: Rs. {change.toLocaleString()}
            </p>
          )}
          {outstanding > 0 && (
            <p className="text-[11px] text-orange-500 font-medium">
              {t("outstanding")}: Rs. {outstanding.toLocaleString()}
            </p>
          )}
        </div>

        {/* Complete Sale button — direct, no dialog */}
        <Button
          className={`w-full h-9 text-sm font-semibold shadow-lg ${
            isOffline
              ? "bg-yellow-600 hover:bg-yellow-700 shadow-yellow-600/25"
              : "shadow-primary/25"
          }`}
          disabled={isPending || items.length === 0}
          onClick={handleCompleteSale}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
              {t("processing")}
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4 me-2" />
              {isOffline
                ? `${t("completeSale")} (Offline)`
                : t("completeSale")} ({totalItems})
            </>
          )}
        </Button>

        {/* Print last invoice */}
        {lastOrder && (
          <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => handlePrint()}>
            <Printer className="h-3 w-3 me-1.5" />
            {t("printInvoice")} ({lastInvoiceId})
          </Button>
        )}
      </div>

      {/* Hidden Print Template */}
      {lastOrder && (
        <div
          className="print-wrapper"
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: "148mm",
            minHeight: "210mm",
            background: "#fff",
          }}
        >
          <InvoiceReceipt ref={printRef} order={lastOrder} />
        </div>
      )}
    </>
  );
}
