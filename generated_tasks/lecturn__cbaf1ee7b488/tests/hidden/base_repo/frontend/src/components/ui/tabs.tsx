"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs primitives must be rendered inside <Tabs>");
  return ctx;
}

export function Tabs({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const baseId = React.useId();
  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange, baseId }}>
      <div className="flex flex-col">{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-lg bg-[var(--muted)] p-1 text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useTabs();
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.baseId}-trigger-${value}`}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "rounded-md px-3 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        active
          ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useTabs();
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-trigger-${value}`}
      className={cn("mt-3", className)}
    >
      {children}
    </div>
  );
}
