"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("common");

  const routes = [
    {
      label: t("dashboard"),
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      label: t("pos"),
      icon: ShoppingCart,
      href: "/pos",
    },
    {
      label: t("products"),
      icon: Package,
      href: "/inventory/products",
    },
    {
      label: t("categories"),
      icon: Tags,
      href: "/inventory/categories",
    },
    {
      label: t("suppliers"),
      icon: Truck,
      href: "/inventory/suppliers",
    },
    {
      label: t("customers"),
      icon: Users,
      href: "/customers",
    },
    {
      label: t("orders"),
      icon: FileText,
      href: "/orders",
    },
    {
      label: t("reports"),
      icon: BarChart3,
      href: "/reports",
    },
    {
      label: t("employees"),
      icon: Users,
      href: "/employees",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Brand Header */}
      <div className="px-4 py-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <Store className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-sidebar" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
              {t("appName")}
            </span>
            <span className="text-xs text-sidebar-foreground/50">
              {t("pos")}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {routes.map((route) => {
            const isActive =
              pathname === route.href || pathname.startsWith(`${route.href}/`);

            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <route.icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive ? "" : "group-hover:scale-110",
                  )}
                />
                <span className="flex-1">{route.label}</span>
                {isActive && (
                  <ChevronLeft className="w-4 h-4 opacity-70 rtl:rotate-180" />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <span className="text-xs font-bold text-white">v2</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-sidebar-foreground">
              Version 2.0
            </span>
            <span className="text-xs text-sidebar-foreground/50">
              Latest Update
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile Sidebar
export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-72 bg-sidebar border-sidebar-border"
      >
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
