import Dexie, { type Table } from 'dexie';

// Define types that match our Drizzle schema (simplified for client usage)
export interface OfflineItem {
  id: string;
  productName: string;
  sku: string | null;
  barcode: string | null;
  categoryId: string | null;
  quantity: number;
  retailPrice: number;
  wholesalePrice: number | null;
  costPrice: number | null;
  minStockLevel: number;
  imgUrl: string | null;
  priceType: 'RETAIL' | 'WHOLESALE';
  isActive: boolean;
  updatedAt: string; // ISO string for sync comparison
  synced: boolean; // Sync status flag
}

export interface OfflineCustomer {
  id: string;
  name: string;
  phone: string;
  cnic: string | null;
  address: string | null;
  paidAmount: number;
  outstandingAmount: number;
  isActive: boolean;
  updatedAt: string;
  synced: boolean;
}

export interface OfflineOrder {
  id: string; // uuid
  invoiceId: string;
  customerId: string | null;
  customerName?: string | null; // Denormalized for display
  customerPhone?: string | null; // Denormalized for receipt
  walkInCustomerName: string | null;
  subtotal: number;
  totalDiscount: number;
  totalPrice: number;
  totalProfit?: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'ONLINE_PAYMENT' | null;
  orderStatus: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'CANCELLED';
  isWholesale: boolean;
  createdAt: string;
  items: OfflineOrderItem[];
  synced: boolean;
}

export interface OfflineOrderItem {
    id: string;
    orderId: string;
    itemId: string | null;
    productNameSnapshot: string;
    quantity: number;
    priceType: 'RETAIL' | 'WHOLESALE';
    appliedPrice: number;
    discountAmount: number;
    itemTotal: number;
}

export interface OfflineCategory {
    id: string;
    name: string;
    synced: boolean;
}

export interface OfflineSupplier {
    id: string;
    name: string;
    phone: string;
    address: string | null;
    totalAmount: number;
    amountPaid: number;
    remainingAmount: number;
    isActive: boolean;
    synced: boolean;
}

export interface OfflineEmployee {
    id: string;
    name: string;
    cnic: string;
    phone: string | null;
    salary: number;
    isActive: boolean;
    synced: boolean;
}

export interface OfflinePurchaseOrder {
    id: string;
    supplierId: string;
    supplierName?: string;
    purchaseDate: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    itemCount: number;
    synced: boolean;
}

export interface SyncQueueItem {
    id?: number;
    table: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    data: any;
    timestamp: number;
}

// Dashboard cached metrics
export interface DashboardCache {
  id: string; // 'dashboard_metrics'
  todaySales: number;
  todayOrders: number;
  todayProfit: number;
  pendingPayments: number;
  lowStockCount: number;
  totalCustomers: number;
  totalProducts: number;
  recentOrders: OfflineOrder[];
  updatedAt: string;
}

export class OfflineDatabase extends Dexie {
  items!: Table<OfflineItem>;
  customers!: Table<OfflineCustomer>;
  orders!: Table<OfflineOrder>;
  categories!: Table<OfflineCategory>;
  suppliers!: Table<OfflineSupplier>;
  employees!: Table<OfflineEmployee>;
  purchaseOrders!: Table<OfflinePurchaseOrder>;
  syncQueue!: Table<SyncQueueItem>;
  dashboardCache!: Table<DashboardCache>;

  constructor() {
    super('CyclePosOfflineDB');
    
    // Define schema - version 3 adds suppliers, employees, purchaseOrders
    this.version(3).stores({
      items: '&id, productName, barcode, categoryId, synced, isActive',
      customers: '&id, name, phone, cnic, synced, isActive',
      orders: '&id, invoiceId, customerId, synced, createdAt, orderStatus',
      categories: '&id, name, synced',
      suppliers: '&id, name, synced, isActive',
      employees: '&id, name, cnic, synced, isActive',
      purchaseOrders: '&id, supplierId, synced, purchaseDate',
      syncQueue: '++id, table, timestamp',
      dashboardCache: '&id'
    });
  }
}

export const db = new OfflineDatabase();
