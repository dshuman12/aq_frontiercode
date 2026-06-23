"use client";

import { ProductSearch } from "@/components/pos/ProductSearch";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { createPurchaseOrder } from "@/lib/actions/purchase.actions";
import { Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface Props {
  suppliers: any[];
  trigger?: React.ReactNode;
}

interface POItemState {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number | string;
}

export function CreatePurchaseDialog({ suppliers, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [supplierId, setSupplierId] = useState(suppliers.length === 1 ? suppliers[0].id : "");

  const [items, setItems] = useState<POItemState[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "ONLINE_PAYMENT">("CASH");

  // Re-sync supplier if suppliers array changes (e.g. going from 0 to 1 supplier loaded)
  if (suppliers.length === 1 && supplierId !== suppliers[0].id) {
      setSupplierId(suppliers[0].id);
  }

  const grandTotal = items.reduce((acc, item) => acc + (item.quantity * (Number(item.costPrice) || 0)), 0);
  const parsedPaid = parseFloat(paidAmount || "0");
  const balanceRemaining = Math.max(0, grandTotal - parsedPaid);

  const handleAddProduct = (product: any) => {
    // If exact product exists, just increment quantity
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.productName,
          quantity: 1,
          costPrice: product.costPrice != null && Number(product.costPrice) > 0 ? Number(product.costPrice) : "",
        },
      ];
    });
    toast.success(`Added: ${product.productName}`);
  };

  const updateQuantity = (index: number, val: number) => {
    if (val < 1) return;
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: val };
      return next;
    });
  };

  const updateCostPrice = (index: number, val: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], costPrice: val };
      return next;
    });
  };

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    if (!supplierId) {
        toast.error("Please select a supplier.");
        return;
    }
    if (items.length === 0) {
      toast.error("Purchase order must have at least one item.");
      return;
    }

    startTransition(async () => {
      const payload = {
        supplierId,
        totalAmount: grandTotal,
        paidAmount: parsedPaid,
        paymentMethod,
        items: items.map(i => ({
            itemId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            costPrice: Number(i.costPrice) || 0,
            sellingPrice: Number(i.costPrice) || 0 // Fallback for offline type safety
        }))
      };

      if (!navigator.onLine) {
         try {
             const { createPurchaseOrderOffline } = await import('@/offline/offline-service');
             // Map POS payment methods to offline subset
             const mappedMethod = paymentMethod === 'CASH' ? 'CASH' : paymentMethod === 'CARD' ? 'BANK_TRANSFER' : 'CHEQUE';
             const offlinePayload = { ...payload, amountPaid: payload.paidAmount, paymentMethod: mappedMethod as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' };
             const result = await createPurchaseOrderOffline(offlinePayload);
             
             if (result.success) {
                 toast.success("Purchase Order saved offline!");
                 setOpen(false);
                 if (suppliers.length !== 1) setSupplierId("");
                 setItems([]);
                 setPaidAmount("");
                 setPaymentMethod("CASH");
             } else {
                 toast.error(result.error || "Failed to save offline");
             }
         } catch (e: any) {
             toast.error(e.message || "Failed to save offline");
         }
         return;
      }

      const result = await createPurchaseOrder(payload);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Purchase Order recorded successfully!");
        setOpen(false);
        // Reset state (keep supplierId if it's forced)
        if (suppliers.length !== 1) setSupplierId("");
        setItems([]);
        setPaidAmount("");
        setPaymentMethod("CASH");
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>New Purchase</Button>}
      </DialogTrigger>

      <DialogContent
        style={{ maxWidth: "min(1200px, 95vw)", width: "min(1200px, 95vw)" }}
        className="h-[88vh] flex flex-col gap-0 p-0 overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 pr-12 border-b shrink-0 flex flex-row items-center justify-between">
          <DialogTitle>Create Purchase Order</DialogTitle>
          <div className="w-[300px] flex items-center gap-2 pr-2">
             <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Supplier:</span>
             <Select value={supplierId} onValueChange={setSupplierId} disabled={suppliers.length === 1}>
                <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                    {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {/* Two-column body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── LEFT: Product browser ─────────────────────────────────── */}
          <div className="flex flex-col flex-1 min-w-0 border-r overflow-hidden">
            <p className="shrink-0 px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Products Catalog
            </p>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <ProductSearch
                onAddProduct={handleAddProduct}
                isWholesaleOverride={false}
                hideCustomerSelector={true}
              />
            </div>
          </div>

          {/* ── RIGHT: Order panel ── */}
          <div className="flex flex-col w-[550px] shrink-0 overflow-hidden bg-muted/5">
            <div className="shrink-0 flex items-center gap-2 px-4 pt-3 pb-1 border-b bg-background">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Purchase Items
                {items.length > 0 && (
                  <span className="ml-1.5 text-primary normal-case font-bold">
                    ({items.length})
                  </span>
                )}
              </p>
            </div>

            {/* Items table */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-background">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="pl-4 w-auto">Product</TableHead>
                    <TableHead className="w-[95px] text-center">Unit Cost</TableHead>
                    <TableHead className="w-[110px] text-center">Qty</TableHead>
                    <TableHead className="w-[90px] text-right">Line Total</TableHead>
                    <TableHead className="w-[40px] pr-3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-32 text-center text-sm text-muted-foreground"
                      >
                        Add products from the left panel
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={`${item.productId}-${index}`}>
                        <TableCell className="pl-4 text-sm font-medium max-w-[130px]">
                          <span className="line-clamp-2 leading-tight">
                            {item.productName}
                          </span>
                        </TableCell>
                        <TableCell className="text-center p-1">
                          <Input
                            value={item.costPrice}
                            onChange={(e) => updateCostPrice(index, e.target.value)}
                            className="w-[90px] h-8 text-center text-sm px-1 mx-auto"
                            type="number"
                            min={0}
                            step="any"
                          />
                        </TableCell>
                        <TableCell className="text-center p-1">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <Input
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(index, parseInt(e.target.value) || 1)
                              }
                              className="w-12 h-7 text-center text-sm px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-none shadow-none bg-transparent"
                              type="number"
                              min={1}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          Rs. {((Number(item.costPrice) || 0) * item.quantity).toLocaleString()}
                        </TableCell>
                        <TableCell className="pr-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Summary + actions */}
            <div className="shrink-0 border-t bg-muted/10">
              <div className="px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground items-center">
                  <span>Grand Total</span>
                  <span className="font-medium text-foreground text-base">
                    Rs. {grandTotal.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-muted-foreground gap-4">
                  <span className="font-medium whitespace-nowrap">Amount Paid</span>
                  <div className="flex items-center w-[150px]">
                    <span className="bg-background border border-r-0 rounded-l-md px-3 h-8 flex items-center text-muted-foreground font-medium text-xs">Rs.</span>
                    <Input 
                        type="number" 
                        className="h-8 rounded-l-none text-right font-medium" 
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="0"
                    />
                  </div>
                </div>

                {parseFloat(paidAmount || "0") > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground gap-4">
                    <span className="font-medium whitespace-nowrap">Payment Method</span>
                    <div className="w-[150px]">
                      <Select 
                        value={paymentMethod} 
                        onValueChange={(val: any) => setPaymentMethod(val)}
                      >
                        <SelectTrigger className="h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CARD">Card</SelectItem>
                            <SelectItem value="ONLINE_PAYMENT">Online</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center font-bold pt-1.5 border-t mt-2">
                  <span className="text-muted-foreground">Balance Remaining</span>
                  <span className={`text-base ${balanceRemaining > 0 ? "text-destructive" : "text-green-600"}`}>
                    Rs. {balanceRemaining.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-[2] text-sm font-semibold"
                  onClick={handleSave}
                  disabled={isPending || items.length === 0 || !supplierId}
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Purchase Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
