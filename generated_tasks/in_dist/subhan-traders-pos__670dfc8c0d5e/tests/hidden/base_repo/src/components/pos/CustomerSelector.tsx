"use client";

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
import { Label } from "@/components/ui/label";
import { useOffline } from "@/hooks/use-offline";
import { searchCustomers } from "@/lib/actions/pos.actions";
import { searchCustomersOffline } from "@/offline/offline-service";
import { usePOSStore } from "@/store/use-pos-store";
import { Check, Loader2, Search, User, UserPlus, WifiOff, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  outstandingAmount: string | number;
}

export function CustomerSelector() {
  const t = useTranslations("pos");
  const tCustomers = useTranslations("customers");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isPending, startTransition] = useTransition();
  const [showWalkIn, setShowWalkIn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isOffline } = useOffline();
  const { customer, walkInCustomer, setCustomer, setWalkInCustomer } = usePOSStore();

  // Load all customers when dialog opens + search as user types
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setShowWalkIn(false);
      // Immediately load all customers
      startTransition(async () => {
        try {
          const results = await fetchCustomers("");
          setCustomers(results);
        } catch {
          setCustomers([]);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchCustomers = async (q: string): Promise<Customer[]> => {
    if (isOffline) {
      const offline = await searchCustomersOffline(q);
      return offline.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        outstandingAmount: c.outstandingAmount,
      }));
    }
    try {
      return await searchCustomers(q);
    } catch {
      const offline = await searchCustomersOffline(q);
      return offline.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        outstandingAmount: c.outstandingAmount,
      }));
    }
  };

  // Re-fetch when query changes (live search)
  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      try {
        const results = await fetchCustomers(query);
        setCustomers(results);
      } catch {
        setCustomers([]);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isOffline]);

  const handleSelectCustomer = (c: Customer) => {
    const outstandingAmount =
      typeof c.outstandingAmount === "string"
        ? parseFloat(c.outstandingAmount)
        : c.outstandingAmount;
    setCustomer({ id: c.id, name: c.name, phone: c.phone, outstandingAmount });
    setOpen(false);
  };

  const handleSetWalkIn = (data: { name: string; phone: string; cnic: string }) => {
    setWalkInCustomer(data);
    setOpen(false);
  };

  const clearCustomer = () => {
    setCustomer(null);
    setWalkInCustomer(null);
  };

  // Label for the trigger button
  const selectedLabel = customer
    ? customer.name
    : walkInCustomer
    ? walkInCustomer.name || t("walkInCustomer")
    : null;

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
            <User className="h-3 w-3" />
            {selectedLabel ? (
              <span className="max-w-[120px] truncate">{selectedLabel}</span>
            ) : (
              t("customerOptional")
            )}
            {isOffline && <WifiOff className="h-3 w-3 text-yellow-500" />}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("customerOptional")}
            </DialogTitle>
          </DialogHeader>

          {!showWalkIn ? (
            <div className="flex flex-col gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder={
                    isOffline
                      ? `${t("searchCustomer")} (Offline)`
                      : t("searchCustomer")
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={`ps-10 ${isOffline ? "border-yellow-500/50" : ""}`}
                />
              </div>

              {/* Customer List */}
              <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                {isPending ? (
                  <div className="flex items-center justify-center gap-2 p-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading customers…</span>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-muted-foreground gap-1">
                    <User className="h-6 w-6 opacity-30" />
                    <p className="text-sm">
                      {query ? tCustomers("noCustomersFound") : "No customers yet"}
                    </p>
                  </div>
                ) : (
                  customers.map((c) => {
                    const outstanding =
                      typeof c.outstandingAmount === "string"
                        ? parseFloat(c.outstandingAmount)
                        : c.outstandingAmount;
                    const isSelected = customer?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        className={`w-full px-4 py-2.5 text-start hover:bg-muted flex items-center justify-between border-b last:border-0 transition-colors ${
                          isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                        }`}
                        onClick={() => handleSelectCustomer(c)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {outstanding > 0 && (
                            <span className="text-xs text-orange-500 font-medium">
                              Rs. {outstanding.toLocaleString()} due
                            </span>
                          )}
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Count */}
              {!isPending && customers.length > 0 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {customers.length} customer{customers.length !== 1 ? "s" : ""}
                  {query ? " found" : ""}
                </p>
              )}

              {/* Walk-in button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowWalkIn(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t("walkInCustomer")}
              </Button>
            </div>
          ) : (
            /* Walk-in form */
            <div className="flex flex-col gap-3">
              <WalkInForm onSubmit={handleSetWalkIn} />
              <Button variant="ghost" onClick={() => setShowWalkIn(false)}>
                ← Back to search
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear badge shown when customer is selected */}
      {selectedLabel && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={clearCustomer}
          title="Remove customer"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Outstanding badge */}
      {customer && customer.outstandingAmount > 0 && (
        <Badge variant="outline" className="text-orange-500 border-orange-500/30">
          Rs. {customer.outstandingAmount.toLocaleString()} due
        </Badge>
      )}
    </div>
  );
}

function WalkInForm({
  onSubmit,
}: {
  onSubmit: (data: { name: string; phone: string; cnic: string }) => void;
}) {
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, phone, cnic });
      }}
    >
      <div>
        <Label className="text-xs">{t("customerName")}</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("customerName")}
        />
      </div>
      <div>
        <Label className="text-xs">{t("phone")}</Label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03XX-XXXXXXX"
        />
      </div>
      <div>
        <Label className="text-xs">{t("cnic")}</Label>
        <Input
          value={cnic}
          onChange={(e) => setCnic(e.target.value)}
          placeholder="XXXXX-XXXXXXX-X"
        />
      </div>
      <Button type="submit" className="w-full">
        <Check className="h-4 w-4 mr-2" />
        {tCommon("confirm")}
      </Button>
    </form>
  );
}
