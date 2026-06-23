'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useOfflineData, useOnlineStatus } from "@/hooks/use-offline-data";
import { getOfflineDashboardStats } from "@/offline/offline-service";
import { format } from "date-fns";
import {
    Activity,
    AlertTriangle,
    CloudOff,
    CreditCard,
    Package,
    RefreshCw,
    ShoppingCart,
    TrendingUp,
    Users
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface DashboardMetrics {
  revenue: number;
  ordersCount: number;
  lowStockCount: number;
  customerCount: number;
}

interface RecentSale {
  id: string;
  customerName: string | null;
  orderStatus: string;
  totalPrice: number;
  createdAt: string;
}

interface DashboardData {
  metrics: DashboardMetrics;
  recentSales: RecentSale[];
}

// Server fetcher
async function fetchDashboardFromServer(): Promise<DashboardData> {
  const res = await fetch('/api/dashboard');
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

// Offline fetcher - build from local data using optimized queries
async function fetchDashboardOffline(): Promise<DashboardData> {
  const { metrics, recentSales } = await getOfflineDashboardStats();

  return {
    metrics,
    recentSales: recentSales.map(o => ({
      id: o.id,
      customerName: o.customerName || o.walkInCustomerName,
      orderStatus: o.orderStatus,
      totalPrice: o.totalPrice,
      createdAt: o.createdAt,
    })),
  };
}

export function DashboardClient() {
  const isOnline = useOnlineStatus();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const to = useTranslations("orders");
  
  const { data, isLoading, isOffline, refetch } = useOfflineData(
    fetchDashboardFromServer,
    fetchDashboardOffline,
    { 
      refreshOnOnline: true,
      staleTime: 60000, // 60 seconds - dashboard can be slightly stale
      cacheKey: 'dashboard'
    }
  );

  const metrics = data?.metrics || { revenue: 0, ordersCount: 0, lowStockCount: 0, customerCount: 0 };
  const recentSales = data?.recentSales || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            {isOffline && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                <CloudOff className="h-3 w-3 mr-1" />
                {tc("cachedData")}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {t("welcomeMessage")}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={refetch} disabled={!isOnline}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("todaysRevenue")}
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {metrics.revenue.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-xs text-emerald-500 font-medium">
                {t("todaysSales")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tc("orders")}
            </CardTitle>
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Activity className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics.ordersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("ordersProcessed")}
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("lowStockAlerts")}
            </CardTitle>
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {metrics.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("itemsNeedAttention")}
            </p>
          </CardContent>
        </Card>

        {/* Customers Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("totalCustomers")}
            </CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.customerCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("registeredCustomers")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Sales */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("recentSales")}</CardTitle>
              <CardDescription>{t("latestTransactions")}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link href="/orders">{t("viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{to("customer")}</TableHead>
                  <TableHead>{to("status")}</TableHead>
                  <TableHead className="text-right">{to("amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {(sale.customerName || "W")[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {sale.customerName || to("walkIn")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(sale.createdAt), "HH:mm")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.orderStatus === "FULLY_PAID"
                            ? "default"
                            : sale.orderStatus === "PENDING"
                            ? "secondary"
                            : "outline"
                        }
                        className="capitalize"
                      >
                        {sale.orderStatus === "FULLY_PAID" ? to("fullyPaid") :
                         sale.orderStatus === "PENDING" ? to("pending") :
                         sale.orderStatus === "PARTIALLY_PAID" ? to("partiallyPaid") :
                         sale.orderStatus.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      Rs. {sale.totalPrice.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {recentSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-muted-foreground">{t("noRecentSales")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("quickActions")}</CardTitle>
            <CardDescription>{t("commonTasks")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button
              className="w-full justify-start h-auto py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
              asChild
            >
              <Link href="/pos" className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">{t("openPOS")}</div>
                  <div className="text-xs opacity-80">{t("startNewSale")}</div>
                </div>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              asChild
            >
              <Link href="/inventory/products" className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">{t("manageInventory")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("addOrUpdateProducts")}
                  </div>
                </div>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              asChild
            >
              <Link href="/customers" className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">{t("addCustomer")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("registerNewCustomer")}
                  </div>
                </div>
              </Link>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              asChild
            >
              <Link href="/reports" className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">{t("viewReports")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("analyticsInsights")}
                  </div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
