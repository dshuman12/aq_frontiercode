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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { updateOrder } from "@/lib/actions/order.actions";
import { Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface EditOrderDialogProps {
  order: any;
  trigger?: React.ReactNode;
}

interface OrderItemState {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  costPrice?: number;
}

export function EditOrderDialog({ order, trigger }: EditOrderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [items, setItems] = useState<OrderItemState[]>(() =>
    (order.items || []).map((item: any) => ({
      productId: item.itemId,
      productName: item.productNameSnapshot || item.productName || "Unknown",
      quantity: item.quantity,
      price: parseFloat(item.appliedPrice || item.price || 0),
      discount: parseFloat(item.discountAmount || 0),
      costPrice: parseFloat(item.costPriceSnapshot || 0),
    }))
  );

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalDiscount = items.reduce((s, i) => s + i.discount, 0);
  const total = Math.max(0, subtotal - totalDiscount);

  const handleAddProduct = (product: any) => {
    const price =
      typeof product.retailPrice === "string"
        ? parseFloat(product.retailPrice)
        : product.retailPrice;

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
          price,
          discount: 0,
          costPrice:
            typeof product.costPrice === "string"
              ? parseFloat(product.costPrice)
              : product.costPrice,
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

  const updatePrice = (index: number, val: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], price: val };
      return next;
    });
  };

  const updateDiscount = (index: number, val: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], discount: val };
      return next;
    });
  };

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    if (items.length === 0) {
      toast.error("Order must have at least one item");
      return;
    }
    startTransition(async () => {
      const result = await updateOrder({
        orderId: order.id,
        items,
        totalAmount: total,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Order updated successfully");
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Edit</Button>}
      </DialogTrigger>

      <DialogContent
        /* Force the dialog to be wide: 95vw capped at 1200px */
        style={{ maxWidth: "min(1200px, 95vw)", width: "min(1200px, 95vw)" }}
        className="h-[88vh] flex flex-col gap-0 p-0 overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Edit Order #{order.invoiceId}</DialogTitle>
        </DialogHeader>

        {/* Two-column body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── LEFT: Product browser ─────────────────────────────────── */}
          {/* Takes all remaining space; ProductSearch scrolls internally  */}
          <div className="flex flex-col flex-1 min-w-0 border-r overflow-hidden">
            <p className="shrink-0 px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Products
            </p>
            {/* This div scrolls — ProductSearch's IntersectionObserver fires here */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <ProductSearch
                onAddProduct={handleAddProduct}
                isWholesaleOverride={false}
              />
            </div>
          </div>

          {/* ── RIGHT: Order panel — fixed 550px, never scrolls as a whole ── */}
          <div className="flex flex-col w-[550px] shrink-0 overflow-hidden">
            {/* Panel header */}
            <div className="shrink-0 flex items-center gap-2 px-4 pt-3 pb-1 border-b">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Order Items
                {items.length > 0 && (
                  <span className="ml-1.5 text-primary normal-case font-bold">
                    ({items.length})
                  </span>
                )}
              </p>
            </div>

            {/* Items table — this is the ONLY thing that scrolls on the right */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="pl-4 w-auto">Product</TableHead>
                    <TableHead className="w-[85px] text-center">Price</TableHead>
                    <TableHead className="w-[108px] text-center">Qty</TableHead>
                    <TableHead className="w-[85px] text-center">Discount</TableHead>
                    <TableHead className="w-[80px] text-right">Line</TableHead>
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
                            value={item.price}
                            onChange={(e) => updatePrice(index, parseFloat(e.target.value) || 0)}
                            className="w-[70px] h-7 text-center text-sm px-1 mx-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            type="number"
                            min={0}
                          />
                        </TableCell>
                        <TableCell className="text-center p-1">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 shrink-0"
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
                              className="w-11 h-7 text-center text-sm px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              type="number"
                              min={1}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center p-1">
                          <Input
                            value={item.discount}
                            onChange={(e) => updateDiscount(index, parseFloat(e.target.value) || 0)}
                            className="w-[70px] h-7 text-center text-sm px-1 mx-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            type="number"
                            min={0}
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {(item.price * item.quantity - item.discount).toLocaleString()}
                        </TableCell>
                        <TableCell className="pr-3">
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

            {/* Summary + actions — pinned at bottom */}
            <div className="shrink-0 border-t bg-muted/10">
              <div className="px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">
                    Rs. {subtotal.toLocaleString()}
                  </span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span className="text-destructive font-medium">
                      - Rs. {totalDiscount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1.5 border-t">
                  <span>Total</span>
                  <span className="text-primary text-base">
                    Rs. {total.toLocaleString()}
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
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isPending || items.length === 0}
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
