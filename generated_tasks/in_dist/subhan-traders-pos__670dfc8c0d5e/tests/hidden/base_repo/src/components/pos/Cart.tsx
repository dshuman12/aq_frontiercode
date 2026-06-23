"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePOSStore } from "@/store/use-pos-store";
import { Minus, Plus, Trash2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function POSCart() {
  const t = useTranslations("pos");
  const {
    items,
    updateItemQuantity,
    updateItemDiscount,
    updateItemPrice,
    removeItem,
    clearCart,
  } = usePOSStore();

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 rounded-lg border">
        <div className="px-3 py-1.5 border-b">
          <p className="text-sm font-semibold">{t("cart")}</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <p className="text-xs">{t("noItemsInCart")}</p>
            <p className="text-[11px] mt-0.5 opacity-70">{t("addItemsToCart")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden max-h-[240px] rounded-lg border">
      {/* Header — minimal */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <p className="text-sm font-semibold">{t("cart")} ({totalItems})</p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={clearCart}
          >
            <XCircle className="h-3 w-3 mr-0.5" />
            {t("clearCart")}
          </Button>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5">{totalItems} {t("items")}</Badge>
        </div>
      </div>

      {/* Scrollable list — ~2 items visible */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 max-h-[200px]">
        <div className="space-y-1.5">
          {[...items].reverse().map((item) => {
            const defaultPrice =
              item.priceType === "WHOLESALE" && item.wholesalePrice
                ? item.wholesalePrice
                : item.retailPrice;
            const isCustomPrice = item.appliedPrice !== defaultPrice;

            return (
              <div
                key={item.id}
                className="p-2 rounded-md border bg-card space-y-1"
              >
                {/* Row 1 — name + delete */}
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight">{item.productName}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Rs. {item.appliedPrice.toLocaleString()} × {item.quantity}
                      {isCustomPrice && (
                        <span className="text-amber-500 ml-1">(custom)</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Row 2 — qty + price + discount */}
                <div className="flex items-center gap-1">
                  {/* Quantity controls */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </Button>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItemQuantity(item.id, parseInt(e.target.value) || 1)
                    }
                    className="w-10 h-6 text-center text-xs px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={1}
                    max={item.maxQuantity}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.maxQuantity}
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </Button>

                  {/* Price override */}
                  <div className="flex items-center gap-0.5 ml-auto">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      ₨
                    </span>
                    <Input
                      type="number"
                      value={item.appliedPrice}
                      onChange={(e) =>
                        updateItemPrice(item.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-[70px] h-6 text-xs px-1.5 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min={0}
                    />
                  </div>

                  {/* Discount */}
                  <div className="flex items-center gap-0.5">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      -
                    </span>
                    <Input
                      type="number"
                      value={item.discount}
                      onChange={(e) =>
                        updateItemDiscount(item.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-[55px] h-6 text-xs px-1.5 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min={0}
                    />
                  </div>
                </div>

                {/* Row 3 — item total */}
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{t("itemTotal")}</span>
                  <span className="font-semibold text-xs">
                    Rs. {(item.appliedPrice * item.quantity - item.discount).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
