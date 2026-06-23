'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOfflineData, useOnlineStatus } from '@/hooks/use-offline-data';
import { getAllActiveItems, getOfflineReportStats } from '@/offline/offline-service';
import { format, subDays, startOfMonth, startOfYear, subMonths } from 'date-fns';
import {
  AlertTriangle,
  BarChart3,
  CloudOff,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Printer,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DailyData {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

interface PaymentSplit {
  method: string;
  count: number;
  amount: number;
}

interface StatusSplit {
  status: string;
  count: number;
}

interface TopProduct {
  name: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  margin: number;
}

interface TopCustomer {
  name: string;
  orders: number;
  totalSpend: number;
  outstanding: number;
}

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  minStockLevel: number;
  category: string | null;
}

interface PurchaseOrder {
  id: string;
  supplierName: string;
  date: string;
  amount: number;
  paid: number;
  remaining: number;
  notes: string | null;
}

interface OrderRow {
  id: string;
  invoiceId: string;
  createdAt: string;
  customerName: string | null;
  itemCount: number;
  subtotal: number;
  totalDiscount: number;
  totalPrice: number;
  totalProfit: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod: string | null;
  orderStatus: string;
  isWholesale: boolean;
}

interface ReportsData {
  overview: {
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    avgOrderValue: number;
    totalDiscount: number;
    totalOutstanding: number;
    cancelledOrders: number;
  };
  dailyBreakdown: DailyData[];
  paymentMethodSplit: PaymentSplit[];
  orderStatusSplit: StatusSplit[];
  topProducts: TopProduct[];
  topCustomers: TopCustomer[];
  inventory: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalStockValue: number;
    lowStockItems: LowStockItem[];
  };
  purchases: {
    totalPurchased: number;
    totalPaid: number;
    totalDue: number;
    orders: PurchaseOrder[];
  };
  orders: OrderRow[];
}

// ─── Fetch Functions ────────────────────────────────────────────────────────────

async function fetchReportsFromServer(from: string, to: string): Promise<ReportsData> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(`/api/reports?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json() as Promise<ReportsData>;
}

async function fetchReportsOffline(from: string, to: string): Promise<ReportsData> {
  const [rawOrders, allItems] = await Promise.all([
    getOfflineReportStats(from, to),
    getAllActiveItems(),
  ]);

  const activeOrders = rawOrders.filter((o) => o.orderStatus !== 'CANCELLED');

  const totalRevenue = activeOrders.reduce((acc, o) => acc + o.totalPrice, 0);
  const totalProfit = activeOrders.reduce((acc, o) => acc + (o.totalProfit ?? 0), 0);
  const totalDiscount = activeOrders.reduce((acc, o) => acc + o.totalDiscount, 0);
  const totalOutstanding = activeOrders.reduce((acc, o) => acc + o.outstandingAmount, 0);
  const avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;
  const cancelledOrders = rawOrders.filter((o) => o.orderStatus === 'CANCELLED').length;

  const dailyMap = new Map<string, DailyData>();
  for (const o of activeOrders) {
    const dateKey = new Date(o.createdAt).toISOString().split('T')[0];
    const existing = dailyMap.get(dateKey) ?? { date: dateKey, revenue: 0, profit: 0, orders: 0 };
    dailyMap.set(dateKey, {
      date: dateKey,
      revenue: existing.revenue + o.totalPrice,
      profit: existing.profit + (o.totalProfit ?? 0),
      orders: existing.orders + 1,
    });
  }
  const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const paymentMap = new Map<string, { count: number; amount: number }>();
  for (const o of activeOrders) {
    if (!o.paymentMethod) continue;
    const existing = paymentMap.get(o.paymentMethod) ?? { count: 0, amount: 0 };
    paymentMap.set(o.paymentMethod, {
      count: existing.count + 1,
      amount: existing.amount + o.totalPrice,
    });
  }
  const paymentMethodSplit = Array.from(paymentMap.entries()).map(([method, data]) => ({
    method,
    ...data,
  }));

  const statusMap = new Map<string, number>();
  for (const o of rawOrders) {
    statusMap.set(o.orderStatus, (statusMap.get(o.orderStatus) ?? 0) + 1);
  }
  const orderStatusSplit = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  const productMap = new Map<string, TopProduct>();
  for (const o of activeOrders) {
    for (const item of o.items ?? []) {
      const key = item.productNameSnapshot;
      const existing = productMap.get(key) ?? {
        name: key,
        unitsSold: 0,
        revenue: 0,
        profit: 0,
        margin: 0,
      };
      productMap.set(key, {
        name: key,
        unitsSold: existing.unitsSold + item.quantity,
        revenue: existing.revenue + item.itemTotal,
        profit: existing.profit,
        margin: 0,
      });
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  const customerMap = new Map<string, TopCustomer>();
  for (const o of activeOrders) {
    const name = o.customerName ?? o.walkInCustomerName ?? 'Walk-in';
    const key = o.customerId ?? `walkin_${name}`;
    const existing = customerMap.get(key) ?? { name, orders: 0, totalSpend: 0, outstanding: 0 };
    customerMap.set(key, {
      name,
      orders: existing.orders + 1,
      totalSpend: existing.totalSpend + o.totalPrice,
      outstanding: existing.outstanding + o.outstandingAmount,
    });
  }
  const topCustomers = Array.from(customerMap.values())
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 15);

  const lowStockItems = allItems.filter((i) => i.quantity > 0 && i.quantity <= (i.minStockLevel ?? 5));
  const outOfStockItems = allItems.filter((i) => i.quantity === 0);
  const totalStockValue = allItems.reduce(
    (acc, i) => acc + (i.costPrice ?? 0) * i.quantity,
    0
  );

  return {
    overview: {
      totalRevenue,
      totalProfit,
      totalOrders: activeOrders.length,
      avgOrderValue,
      totalDiscount,
      totalOutstanding,
      cancelledOrders,
    },
    dailyBreakdown,
    paymentMethodSplit,
    orderStatusSplit,
    topProducts,
    topCustomers,
    inventory: {
      totalProducts: allItems.length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      totalStockValue,
      lowStockItems: [...lowStockItems, ...outOfStockItems].slice(0, 50).map((i) => ({
        id: i.id,
        name: i.productName,
        quantity: i.quantity,
        minStockLevel: i.minStockLevel ?? 5,
        category: i.categoryName ?? null,
      })),
    },
    purchases: { totalPurchased: 0, totalPaid: 0, totalDue: 0, orders: [] },
    orders: rawOrders.map((o) => ({
      id: o.id,
      invoiceId: o.invoiceId,
      createdAt: o.createdAt,
      customerName: o.customerName ?? o.walkInCustomerName ?? null,
      itemCount: o.items?.length ?? 0,
      subtotal: o.subtotal,
      totalDiscount: o.totalDiscount,
      totalPrice: o.totalPrice,
      totalProfit: o.totalProfit ?? 0,
      paidAmount: o.paidAmount,
      outstandingAmount: o.outstandingAmount,
      paymentMethod: o.paymentMethod ?? null,
      orderStatus: o.orderStatus,
      isWholesale: o.isWholesale,
    })),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `Rs. ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rs. ${(n / 1_000).toFixed(1)}K`;
  return `Rs. ${n.toFixed(0)}`;
}

function getPresetDates(preset: string): { from: string; to: string } {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr };
    case 'yesterday': {
      const y = format(subDays(today, 1), 'yyyy-MM-dd');
      return { from: y, to: y };
    }
    case 'last7':
      return { from: format(subDays(today, 6), 'yyyy-MM-dd'), to: todayStr };
    case 'last30':
      return { from: format(subDays(today, 29), 'yyyy-MM-dd'), to: todayStr };
    case 'thisMonth':
      return { from: format(startOfMonth(today), 'yyyy-MM-dd'), to: todayStr };
    case 'lastMonth': {
      const lm = subMonths(today, 1);
      return {
        from: format(startOfMonth(lm), 'yyyy-MM-dd'),
        to: format(new Date(lm.getFullYear(), lm.getMonth() + 1, 0), 'yyyy-MM-dd'),
      };
    }
    case 'thisYear':
      return { from: format(startOfYear(today), 'yyyy-MM-dd'), to: todayStr };
    default:
      return { from: todayStr, to: todayStr };
  }
}

// ─── PIE COLORS ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['hsl(221,70%,55%)', 'hsl(142,70%,45%)', 'hsl(38,92%,50%)', 'hsl(0,72%,55%)'];

const STATUS_COLORS: Record<string, string> = {
  FULLY_PAID: 'hsl(142,70%,45%)',
  PARTIALLY_PAID: 'hsl(38,92%,50%)',
  PENDING: 'hsl(221,70%,55%)',
  CANCELLED: 'hsl(0,72%,55%)',
};

// ─── Sub-components ─────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  accent?: string;
}

function KpiCard({ title, value, sub, icon, trend, accent = 'hsl(221,70%,55%)' }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: accent }}
      />
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
            {sub && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                {sub}
              </p>
            )}
          </div>
          <div
            className="shrink-0 rounded-xl p-2.5"
            style={{ background: `${accent}22` }}
          >
            <div style={{ color: accent }}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
        <div className="h-7 bg-muted rounded w-3/4 animate-pulse" />
        <div className="h-2.5 bg-muted rounded w-1/3 animate-pulse" />
      </CardContent>
    </Card>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab Navigation ────────────────────────────────────────────────────────────

const TABS = ['overview', 'products', 'customers', 'inventory', 'purchases', 'orders'] as const;
type TabKey = (typeof TABS)[number];

interface TabNavProps {
  active: TabKey;
  onChange: (t: TabKey) => void;
  labels: Record<TabKey, string>;
  icons: Record<TabKey, React.ReactNode>;
}

function TabNav({ active, onChange, labels, icons }: TabNavProps) {
  return (
    <div className="flex gap-1 flex-wrap border rounded-xl p-1 bg-muted/40">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
            active === tab
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="h-3.5 w-3.5">{icons[tab]}</span>
          {labels[tab]}
        </button>
      ))}
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────────────────

const trendChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(221,70%,55%)' },
  profit: { label: 'Profit', color: 'hsl(142,70%,45%)' },
} satisfies ChartConfig;

const ordersChartConfig = {
  orders: { label: 'Orders', color: 'hsl(38,92%,50%)' },
} satisfies ChartConfig;

function OverviewTab({ data }: { data: ReportsData }) {
  const { overview, dailyBreakdown, paymentMethodSplit, orderStatusSplit } = data;
  const profitMargin =
    overview.totalRevenue > 0
      ? ((overview.totalProfit / overview.totalRevenue) * 100).toFixed(1)
      : '0';

  const formattedDaily = dailyBreakdown.map((d) => ({
    ...d,
    label: format(new Date(d.date + 'T00:00:00'), 'MMM d'),
  }));

  return (
    <div className="space-y-6">
      {/* KPI Grid — 6 cards → clean 2×3 on desktop */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <KpiCard
          title="Total Revenue"
          value={fmtShort(overview.totalRevenue)}
          sub={`${overview.totalOrders} orders`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="hsl(221,70%,55%)"
        />
        <KpiCard
          title="Net Profit"
          value={fmtShort(overview.totalProfit)}
          sub={`${profitMargin}% margin`}
          icon={<Wallet className="h-5 w-5" />}
          accent="hsl(142,70%,45%)"
          trend="up"
        />
        <KpiCard
          title="Total Orders"
          value={String(overview.totalOrders)}
          sub={`${overview.cancelledOrders} cancelled`}
          icon={<ShoppingCart className="h-5 w-5" />}
          accent="hsl(38,92%,50%)"
        />
        <KpiCard
          title="Avg Order Value"
          value={fmtShort(overview.avgOrderValue)}
          icon={<BarChart3 className="h-5 w-5" />}
          accent="hsl(271,70%,55%)"
        />
        <KpiCard
          title="Discount Given"
          value={fmtShort(overview.totalDiscount)}
          icon={<TrendingDown className="h-5 w-5" />}
          accent="hsl(0,72%,55%)"
          trend="down"
        />
        <KpiCard
          title="Outstanding Balance"
          value={fmtShort(overview.totalOutstanding)}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="hsl(38,92%,50%)"
        />
      </div>

      {/* Revenue & Profit Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Revenue &amp; Profit Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {formattedDaily.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No data for this period
            </div>
          ) : (
            <ChartContainer config={trendChartConfig} className="h-[260px] w-full">
              <AreaChart data={formattedDaily} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221,70%,55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(221,70%,55%)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142,70%,45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142,70%,45%)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => fmtShort(v)} tick={{ fontSize: 11 }} width={70} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        typeof value === 'number' ? fmt(value) : String(value)
                      }
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(221,70%,55%)"
                  fill="url(#revGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(142,70%,45%)"
                  fill="url(#profGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Daily Orders + Pies */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Daily Orders bar */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Daily Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {formattedDaily.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No data
              </div>
            ) : (
              <ChartContainer config={ordersChartConfig} className="h-[200px] w-full">
                <BarChart data={formattedDaily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="orders" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {paymentMethodSplit.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No data
              </div>
            ) : (
              <>
                <ChartContainer
                  config={Object.fromEntries(
                    paymentMethodSplit.map((p, i) => [
                      p.method,
                      { label: p.method, color: PIE_COLORS[i % PIE_COLORS.length] },
                    ])
                  )}
                  className="h-[180px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={paymentMethodSplit}
                      dataKey="count"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ method, percent }: any) =>
                        `${method || 'Unknown'} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {paymentMethodSplit.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </>
            )}
          </CardContent>
        </Card>

        {/* Order Status pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Order Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {orderStatusSplit.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No data
              </div>
            ) : (
              <ChartContainer
                config={Object.fromEntries(
                  orderStatusSplit.map((s) => [
                    s.status,
                    { label: s.status, color: STATUS_COLORS[s.status] ?? 'hsl(221,70%,55%)' },
                  ])
                )}
                className="h-[180px] w-full"
              >
                <PieChart>
                  <Pie
                    data={orderStatusSplit}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                  >
                    {orderStatusSplit.map((s, i) => (
                      <Cell
                        key={i}
                        fill={STATUS_COLORS[s.status] ?? PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Products Tab ───────────────────────────────────────────────────────────────

const productsChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(221,70%,55%)' },
} satisfies ChartConfig;

function ProductsTab({ products }: { products: TopProduct[] }) {
  const top10 = products.slice(0, 10);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Top Products by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {top10.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No sales data for this period
            </div>
          ) : (
            <ChartContainer config={productsChartConfig} className="h-[320px] w-full">
              <BarChart
                data={top10}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => fmtShort(v)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={120}
                  tickFormatter={(v: string) => (v.length > 15 ? v.slice(0, 15) + '…' : v)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        typeof value === 'number' ? fmt(value) : String(value)
                      }
                    />
                  }
                />
                <Bar dataKey="revenue" fill="hsl(221,70%,55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Product Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No data for this period
                  </TableCell>
                </TableRow>
              )}
              {products.map((p, i) => (
                <TableRow key={p.name}>
                  <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{p.unitsSold}</TableCell>
                  <TableCell className="text-right">{fmt(p.revenue)}</TableCell>
                  <TableCell className="text-right">{fmt(p.profit)}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={
                        p.margin >= 20
                          ? 'border-emerald-500 text-emerald-600'
                          : p.margin >= 10
                          ? 'border-yellow-500 text-yellow-600'
                          : 'border-red-500 text-red-600'
                      }
                    >
                      {p.margin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Customers Tab ──────────────────────────────────────────────────────────────

const customersChartConfig = {
  totalSpend: { label: 'Total Spend', color: 'hsl(271,70%,55%)' },
} satisfies ChartConfig;

function CustomersTab({ customers }: { customers: TopCustomer[] }) {
  const top10 = customers.slice(0, 10);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Top Customers by Spend</CardTitle>
        </CardHeader>
        <CardContent>
          {top10.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No customer data for this period
            </div>
          ) : (
            <ChartContainer config={customersChartConfig} className="h-[280px] w-full">
              <BarChart
                data={top10}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => fmtShort(v)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={100}
                  tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 12) + '…' : v)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        typeof value === 'number' ? fmt(value) : String(value)
                      }
                    />
                  }
                />
                <Bar dataKey="totalSpend" fill="hsl(271,70%,55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Customer Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No data for this period
                  </TableCell>
                </TableRow>
              )}
              {customers.map((c, i) => (
                <TableRow key={`${c.name}-${i}`}>
                  <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right">{c.orders}</TableCell>
                  <TableCell className="text-right">{fmt(c.totalSpend)}</TableCell>
                  <TableCell className="text-right">
                    {c.outstanding > 0 ? (
                      <span className="text-red-500 font-medium">{fmt(c.outstanding)}</span>
                    ) : (
                      <span className="text-emerald-500">Settled</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Inventory Tab ──────────────────────────────────────────────────────────────

function InventoryTab({ inventory }: { inventory: ReportsData['inventory'] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <KpiCard
          title="Total Products"
          value={String(inventory.totalProducts)}
          icon={<Package className="h-5 w-5" />}
          accent="hsl(221,70%,55%)"
        />
        <KpiCard
          title="Low Stock Items"
          value={String(inventory.lowStockCount)}
          sub="Below minimum level"
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="hsl(38,92%,50%)"
          trend="down"
        />
        <KpiCard
          title="Out of Stock"
          value={String(inventory.outOfStockCount)}
          icon={<TrendingDown className="h-5 w-5" />}
          accent="hsl(0,72%,55%)"
          trend="down"
        />
        <KpiCard
          title="Total Stock Value"
          value={fmtShort(inventory.totalStockValue)}
          sub="At cost price"
          icon={<Wallet className="h-5 w-5" />}
          accent="hsl(142,70%,45%)"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Low Stock &amp; Out of Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Min Level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.lowStockItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    All items are adequately stocked 🎉
                  </TableCell>
                </TableRow>
              )}
              {inventory.lowStockItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.category ?? '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {item.minStockLevel}
                  </TableCell>
                  <TableCell>
                    {item.quantity === 0 ? (
                      <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs border-amber-500 text-amber-600"
                      >
                        Low Stock
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Purchases Tab ──────────────────────────────────────────────────────────────

function PurchasesTab({ purchases }: { purchases: ReportsData['purchases'] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <KpiCard
          title="Total Purchased"
          value={fmtShort(purchases.totalPurchased)}
          icon={<ShoppingCart className="h-5 w-5" />}
          accent="hsl(221,70%,55%)"
        />
        <KpiCard
          title="Amount Paid"
          value={fmtShort(purchases.totalPaid)}
          icon={<Wallet className="h-5 w-5" />}
          accent="hsl(142,70%,45%)"
          trend="up"
        />
        <KpiCard
          title="Amount Due"
          value={fmtShort(purchases.totalDue)}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="hsl(0,72%,55%)"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No purchases found for this period
                  </TableCell>
                </TableRow>
              )}
              {purchases.orders.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.supplierName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(p.date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">{fmt(p.amount)}</TableCell>
                  <TableCell className="text-right text-emerald-600">{fmt(p.paid)}</TableCell>
                  <TableCell className="text-right">
                    {p.remaining > 0 ? (
                      <span className="text-red-500 font-medium">{fmt(p.remaining)}</span>
                    ) : (
                      <span className="text-emerald-500">Paid</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[120px] truncate">
                    {p.notes ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Orders Tab ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  FULLY_PAID: { label: 'Paid', cls: 'border-emerald-500 text-emerald-600' },
  PARTIALLY_PAID: { label: 'Partial', cls: 'border-amber-500 text-amber-600' },
  PENDING: { label: 'Pending', cls: 'border-blue-500 text-blue-600' },
  CANCELLED: { label: 'Cancelled', cls: 'border-red-500 text-red-600' },
};

const PM_LABEL: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  ONLINE_PAYMENT: 'Online',
};

function OrdersTab({ orders }: { orders: OrderRow[] }) {
  const totalRevenue = orders
    .filter((o) => o.orderStatus !== 'CANCELLED')
    .reduce((acc, o) => acc + o.totalPrice, 0);
  const totalProfit = orders
    .filter((o) => o.orderStatus !== 'CANCELLED')
    .reduce((acc, o) => acc + o.totalProfit, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {orders.length} orders — Revenue: <strong>{fmt(totalRevenue)}</strong> — Profit:{' '}
          <strong>{fmt(totalProfit)}</strong>
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                    No orders found for this period
                  </TableCell>
                </TableRow>
              )}
              {orders.map((o) => {
                const badge = STATUS_BADGE[o.orderStatus] ?? {
                  label: o.orderStatus,
                  cls: '',
                };
                return (
                  <TableRow key={o.id} className={o.orderStatus === 'CANCELLED' ? 'opacity-50' : ''}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(o.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{o.invoiceId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {o.customerName ?? <span className="text-muted-foreground italic">Walk-in</span>}
                        {o.isWholesale && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-purple-400 text-purple-600">
                            WS
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{o.itemCount}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(o.totalPrice)}</TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {fmt(o.totalProfit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {o.outstandingAmount > 0 ? (
                        <span className="text-red-500">{fmt(o.outstandingAmount)}</span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.paymentMethod ? PM_LABEL[o.paymentMethod] ?? o.paymentMethod : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${badge.cls}`}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Print Component ──────────────────────────────────────────────────────────────

function PrintReport({ data, fromDate, toDate }: { data: ReportsData, fromDate: string, toDate: string }) {
  if (!data) return null;
  const { overview, topProducts, inventory } = data;
  return (
    <>
      <style type="text/css" media="print">
        {`
          html, body {
            background-color: white !important;
            color: black !important;
          }
          /* Override absolute positioning for multi-page reports */
          #print-report {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            height: auto !important;
            min-height: 100vh !important;
          }
        `}
      </style>
      <div id="print-report" className="hidden print:block print-wrapper w-[148mm] bg-white text-black p-6 mx-auto z-50">
        <div className="border-b-2 border-black pb-4 mb-6 relative">
          <h1 className="text-2xl font-bold tracking-tight text-black">Business Report</h1>
          <p className="text-base font-semibold text-black mt-1">
            Period: {(!fromDate || !toDate) 
              ? 'All Time / Unspecified' 
              : fromDate === toDate
              ? format(new Date(fromDate + 'T00:00:00'), 'MMM d, yyyy')
              : `${format(new Date(fromDate + 'T00:00:00'), 'MMM d, yyyy')} – ${format(new Date(toDate + 'T00:00:00'), 'MMM d, yyyy')}`}
          </p>
          <p className="text-sm font-semibold text-black absolute top-0 right-0">
            Generated: {format(new Date(), 'MMM d, yyyy HH:mm')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-base">
          <div className="flex justify-between border-b border-black pb-2">
            <span className="font-semibold text-black">Total Revenue</span>
            <span className="font-bold text-black">{fmt(overview.totalRevenue)}</span>
          </div>
          <div className="flex justify-between border-b border-black pb-2">
            <span className="font-semibold text-black">Net Profit</span>
            <span className="font-bold text-black">{fmt(overview.totalProfit)}</span>
          </div>
          <div className="flex justify-between border-b border-black pb-2">
            <span className="font-semibold text-black">Total Orders</span>
            <span className="font-bold text-black">{overview.totalOrders}</span>
          </div>
          <div className="flex justify-between border-b border-black pb-2">
            <span className="font-semibold text-black">Total Outstanding</span>
            <span className="font-bold text-black">{fmt(overview.totalOutstanding)}</span>
          </div>
          <div className="flex justify-between border-b border-black pb-2">
            <span className="font-semibold text-black">Stock Value (at Cost)</span>
            <span className="font-bold text-black">{fmt(inventory.totalStockValue)}</span>
          </div>
          <div className="flex justify-between border-b border-black pb-2">
            <span className="font-semibold text-black">Low Stock Items</span>
            <span className="font-bold text-black">{inventory.lowStockCount}</span>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold border-b-2 border-black pb-2 mb-4 text-black">Top 10 Products by Revenue</h2>
          <table className="w-full text-left text-sm border-collapse text-black">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 font-bold text-black">Product Name</th>
                <th className="py-2 font-bold text-center text-black">Units Sold</th>
                <th className="py-2 font-bold text-right text-black">Revenue</th>
                <th className="py-2 font-bold text-right text-black">Profit</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.slice(0, 10).map((p, i) => (
                <tr key={i} className="border-b border-black">
                  <td className="py-2 font-semibold text-black">{p.name}</td>
                  <td className="py-2 text-center font-semibold text-black">{p.unitsSold}</td>
                  <td className="py-2 text-right font-bold text-black">{fmt(p.revenue)}</td>
                  <td className="py-2 text-right font-bold text-black">{fmt(p.profit)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center font-bold text-black">No products sold in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export function ReportsClient() {
  const isOnline = useOnlineStatus();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(today);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const { data, isLoading, isOffline, refetch } = useOfflineData(
    () => fetchReportsFromServer(fromDate, toDate),
    () => fetchReportsOffline(fromDate, toDate),
    { refreshOnOnline: true }
  );

  const handleGenerate = () => refetch();

  const applyPreset = (preset: string) => {
    const { from, to } = getPresetDates(preset);
    setFromDate(from);
    setToDate(to);
  };

  const tabLabels: Record<TabKey, string> = {
    overview: 'Overview',
    products: 'Products',
    customers: 'Customers',
    inventory: 'Inventory',
    purchases: 'Purchases',
    orders: 'Orders',
  };

  const tabIcons: Record<TabKey, React.ReactNode> = {
    overview: <BarChart3 className="h-3.5 w-3.5" />,
    products: <Package className="h-3.5 w-3.5" />,
    customers: <Users className="h-3.5 w-3.5" />,
    inventory: <AlertTriangle className="h-3.5 w-3.5" />,
    purchases: <ShoppingCart className="h-3.5 w-3.5" />,
    orders: <FileText className="h-3.5 w-3.5" />,
  };

  const PRESETS = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: '7 Days' },
    { key: 'last30', label: '30 Days' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' },
    { key: 'thisYear', label: 'This Year' },
  ];

  return (
    <>
      <div className="print:hidden space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {(!fromDate || !toDate)
                  ? 'Select date range'
                  : fromDate === toDate
                  ? format(new Date(fromDate + 'T00:00:00'), 'MMMM d, yyyy')
                  : `${format(new Date(fromDate + 'T00:00:00'), 'MMM d')} – ${format(new Date(toDate + 'T00:00:00'), 'MMM d, yyyy')}`}
              </p>
            </div>
            {isOffline && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600 shrink-0">
                <CloudOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden sm:flex" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="icon" onClick={handleGenerate} disabled={!isOnline}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.key}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => applyPreset(p.key)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            {/* Custom range */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 text-sm w-36"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 text-sm w-36"
                />
              </div>
              <Button size="sm" onClick={handleGenerate} className="h-8">
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Nav */}
        <TabNav
          active={activeTab}
          onChange={setActiveTab}
          labels={tabLabels}
          icons={tabIcons}
        />

        {/* Content */}
        {isLoading ? (
          <ReportsSkeleton />
        ) : !data ? (
          <Card>
            <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
              No data available. Try adjusting the date range and generating the report.
            </CardContent>
          </Card>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab data={data} />}
            {activeTab === 'products' && <ProductsTab products={data.topProducts} />}
            {activeTab === 'customers' && <CustomersTab customers={data.topCustomers} />}
            {activeTab === 'inventory' && <InventoryTab inventory={data.inventory} />}
            {activeTab === 'purchases' && <PurchasesTab purchases={data.purchases} />}
            {activeTab === 'orders' && <OrdersTab orders={data.orders} />}
          </>
        )}
      </div>

      {!isLoading && data && (
        <PrintReport data={data} fromDate={fromDate} toDate={toDate} />
      )}
    </>
  );
}
