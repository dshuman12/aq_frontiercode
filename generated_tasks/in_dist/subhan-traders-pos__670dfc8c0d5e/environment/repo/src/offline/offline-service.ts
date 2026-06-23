'use client';

import { createId } from '@paralleldrive/cuid2';
import { DashboardCache, db, OfflineCategory, OfflineCustomer, OfflineEmployee, OfflineItem, OfflineOrder, OfflineOrderItem, OfflinePurchaseOrder, OfflineSupplier } from './db';

// ============================================================================
// Data Hydration - Sync server data to local IndexedDB
// ============================================================================

export async function hydrateFromServer(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/offline/hydrate');
    if (!response.ok) {
      throw new Error('Failed to fetch hydration data');
    }

    const data = await response.json();

    // Clear and repopulate items
    await db.items.clear();
    if (data.items?.length > 0) {
      const offlineItems: OfflineItem[] = data.items.map((item: any) => ({
        id: item.id,
        productName: item.productName,
        sku: item.sku,
        barcode: item.barcode,
        categoryId: item.categoryId,
        quantity: item.quantity,
        retailPrice: parseFloat(item.retailPrice),
        wholesalePrice: item.wholesalePrice ? parseFloat(item.wholesalePrice) : null,
        costPrice: item.costPrice ? parseFloat(item.costPrice) : null,
        minStockLevel: item.minStockLevel,
        imgUrl: item.imgUrl,
        priceType: item.priceType,
        isActive: item.isActive,
        updatedAt: item.updatedAt,
        synced: true,
      }));
      await db.items.bulkAdd(offlineItems);
    }

    // Clear and repopulate customers
    await db.customers.clear();
    if (data.customers?.length > 0) {
      const offlineCustomers: OfflineCustomer[] = data.customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        cnic: c.cnic,
        address: c.address,
        paidAmount: parseFloat(c.paidAmount || '0'),
        outstandingAmount: parseFloat(c.outstandingAmount || '0'),
        isActive: c.isActive,
        updatedAt: c.updatedAt,
        synced: true,
      }));
      await db.customers.bulkAdd(offlineCustomers);
    }

    // Clear and repopulate categories
    await db.categories.clear();
    if (data.categories?.length > 0) {
      const offlineCategories: OfflineCategory[] = data.categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        synced: true,
      }));
      await db.categories.bulkAdd(offlineCategories);
    }

    // Clear and repopulate suppliers
    await db.suppliers.clear();
    if (data.suppliers?.length > 0) {
      const offlineSuppliers: OfflineSupplier[] = data.suppliers.map((s: any) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        address: s.address,
        totalAmount: parseFloat(s.totalAmount || '0'),
        amountPaid: parseFloat(s.amountPaid || '0'),
        remainingAmount: parseFloat(s.remainingAmount || '0'),
        isActive: s.isActive,
        synced: true,
      }));
      await db.suppliers.bulkAdd(offlineSuppliers);
    }

    // Clear and repopulate employees
    await db.employees.clear();
    if (data.employees?.length > 0) {
      const offlineEmployees: OfflineEmployee[] = data.employees.map((e: any) => ({
        id: e.id,
        name: e.name,
        cnic: e.cnic,
        phone: e.phone,
        salary: parseFloat(e.salary || '0'),
        isActive: e.isActive,
        synced: true,
      }));
      await db.employees.bulkAdd(offlineEmployees);
    }

    // Clear and repopulate purchase orders
    await db.purchaseOrders.clear();
    if (data.purchaseOrders?.length > 0) {
      const offlinePurchases: OfflinePurchaseOrder[] = data.purchaseOrders.map((po: any) => ({
        id: po.id,
        supplierId: po.supplierId,
        supplierName: po.supplier?.name || null,
        purchaseDate: po.purchaseDate,
        totalAmount: parseFloat(po.totalAmount || '0'),
        paidAmount: parseFloat(po.paidAmount || '0'),
        remainingAmount: parseFloat(po.remainingAmount || '0'),
        itemCount: po.items?.length || 0,
        synced: true,
      }));
      await db.purchaseOrders.bulkAdd(offlinePurchases);
    }

    // Cache orders (keep existing unsynced, add synced from server)
    const unsyncedOrders = await db.orders.filter((o) => Boolean(!o.synced)).toArray();
    await db.orders.clear();
    
    if (data.orders?.length > 0) {
      const offlineOrders: OfflineOrder[] = data.orders.map((o: any) => ({
        id: o.id,
        invoiceId: o.invoiceId,
        customerId: o.customerId,
        customerName: o.customer?.name || o.walkInCustomerName || null,
        walkInCustomerName: o.walkInCustomerName,
        subtotal: parseFloat(o.subtotal),
        totalDiscount: parseFloat(o.totalDiscount),
        totalPrice: parseFloat(o.totalPrice),
        totalProfit: parseFloat(o.totalProfit || '0'),
        paidAmount: parseFloat(o.paidAmount),
        outstandingAmount: parseFloat(o.outstandingAmount),
        paymentMethod: o.paymentMethod,
        orderStatus: o.orderStatus,
        isWholesale: o.isWholesale,
        createdAt: o.createdAt,
        items: o.orderItems?.map((i: any) => ({
          id: i.id,
          orderId: o.id,
          itemId: i.itemId,
          productNameSnapshot: i.productNameSnapshot,
          quantity: i.quantity,
          priceType: i.priceType,
          appliedPrice: parseFloat(i.appliedPrice),
          discountAmount: parseFloat(i.discountAmount),
          itemTotal: parseFloat(i.itemTotal),
        })) || [],
        synced: true,
      }));
      await db.orders.bulkAdd(offlineOrders);
    }
    
    // Re-add unsynced orders
    if (unsyncedOrders.length > 0) {
      await db.orders.bulkPut(unsyncedOrders);
    }

    // Cache dashboard metrics
    if (data.dashboard) {
      await db.dashboardCache.put({
        id: 'dashboard_metrics',
        todaySales: data.dashboard.todaySales || 0,
        todayOrders: data.dashboard.todayOrders || 0,
        todayProfit: data.dashboard.todayProfit || 0,
        pendingPayments: data.dashboard.pendingPayments || 0,
        lowStockCount: data.dashboard.lowStockCount || 0,
        totalCustomers: data.dashboard.totalCustomers || 0,
        totalProducts: data.dashboard.totalProducts || 0,
        recentOrders: data.dashboard.recentOrders || [],
        updatedAt: new Date().toISOString(),
      });
    }

    console.log('✅ Hydration complete:', {
      items: data.items?.length || 0,
      customers: data.customers?.length || 0,
      categories: data.categories?.length || 0,
      suppliers: data.suppliers?.length || 0,
      employees: data.employees?.length || 0,
      purchaseOrders: data.purchaseOrders?.length || 0,
      orders: data.orders?.length || 0,
    });

    return { success: true };
  } catch (error) {
    console.log('ℹ️ Hydration skipped (offline/failed):', error);
    return { success: false, error: String(error) };
  }
}


// ============================================================================
// Product Operations
// ============================================================================

export async function searchProductsOffline(query: string): Promise<OfflineItem[]> {
  if (!query || query.length < 1) {
    // Return recent/all active products with stock
    return db.items
      .filter((item) => Boolean(item.isActive && item.quantity > 0))
      .limit(20)
      .toArray();
  }

  const lowerQuery = query.toLowerCase();

  return db.items
    .filter((item) => {
      if (!item.isActive || item.quantity <= 0) return false;
      
      const matchesName = item.productName.toLowerCase().includes(lowerQuery);
      const matchesBarcode = item.barcode?.toLowerCase() === lowerQuery;
      const matchesSku = item.sku?.toLowerCase().includes(lowerQuery);
      
      return Boolean(matchesName || matchesBarcode || matchesSku);
    })
    .limit(20)
    .toArray();
}

export async function getProductById(id: string): Promise<OfflineItem | undefined> {
  return db.items.get(id);
}

export async function updateLocalStock(itemId: string, quantityChange: number): Promise<void> {
  const item = await db.items.get(itemId);
  if (item) {
    await db.items.update(itemId, {
      quantity: Math.max(0, item.quantity + quantityChange),
    });
  }
}

// ============================================================================
// Customer Operations
// ============================================================================

export async function searchCustomersOffline(query: string): Promise<OfflineCustomer[]> {
  if (!query || query.length < 1) {
    return db.customers
      .filter((c) => Boolean(c.isActive))
      .limit(10)
      .toArray();
  }

  const lowerQuery = query.toLowerCase();

  return db.customers
    .filter((c) => {
      if (!c.isActive) return false;
      
      const matchesName = c.name.toLowerCase().includes(lowerQuery);
      const matchesPhone = c.phone.includes(query);
      
      return Boolean(matchesName || matchesPhone);
    })
    .limit(10)
    .toArray();
}

export async function getCustomerById(id: string): Promise<OfflineCustomer | undefined> {
  return db.customers.get(id);
}

// ============================================================================
// Category Operations
// ============================================================================

export async function getCategoryById(id: string): Promise<OfflineCategory | undefined> {
  return db.categories.get(id);
}

export async function getCategoryName(categoryId: string | null): Promise<string | null> {
  if (!categoryId) return null;
  const category = await db.categories.get(categoryId);
  return category?.name || null;
}

// ============================================================================
// Offline CRUD Operations - Products
// ============================================================================

import { syncManager } from './sync-manager';

export interface CreateProductInput {
  productName: string;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  quantity: number;
  retailPrice: number;
  wholesalePrice?: number | null;
  costPrice?: number | null;
  minStockLevel?: number;
  imgUrl?: string | null;
  priceType?: 'RETAIL' | 'WHOLESALE';
}

export async function createProductOffline(input: CreateProductInput): Promise<{ success: boolean; id: string }> {
  const id = createId();
  const now = new Date().toISOString();
  
  const offlineItem: OfflineItem = {
    id,
    productName: input.productName,
    sku: input.sku || null,
    barcode: input.barcode || null,
    categoryId: input.categoryId || null,
    quantity: input.quantity,
    retailPrice: input.retailPrice,
    wholesalePrice: input.wholesalePrice || null,
    costPrice: input.costPrice || null,
    minStockLevel: input.minStockLevel || 5,
    imgUrl: input.imgUrl || null,
    priceType: input.priceType || 'RETAIL',
    isActive: true,
    updatedAt: now,
    synced: false,
  };

  await db.items.add(offlineItem);
  await syncManager.queueChange('items', 'CREATE', offlineItem);

  return { success: true, id };
}

export async function updateProductOffline(id: string, input: Partial<CreateProductInput>): Promise<{ success: boolean }> {
  const existing = await db.items.get(id);
  if (!existing) return { success: false };

  const updates = {
    ...input,
    updatedAt: new Date().toISOString(),
    synced: false,
  };

  await db.items.update(id, updates);
  await syncManager.queueChange('items', 'UPDATE', { id, ...updates });

  return { success: true };
}

export async function deleteProductOffline(id: string): Promise<{ success: boolean }> {
  const existing = await db.items.get(id);
  if (!existing) return { success: false };

  // Soft delete locally
  await db.items.update(id, { isActive: false, synced: false });
  await syncManager.queueChange('items', 'DELETE', { id });

  return { success: true };
}

// ============================================================================
// Offline CRUD Operations - Customers
// ============================================================================

export interface CreateCustomerInput {
  name: string;
  phone: string;
  cnic?: string | null;
  address?: string | null;
}

export async function createCustomerOffline(input: CreateCustomerInput): Promise<{ success: boolean; id: string }> {
  const id = createId();
  const now = new Date().toISOString();

  const offlineCustomer: OfflineCustomer = {
    id,
    name: input.name,
    phone: input.phone,
    cnic: input.cnic || null,
    address: input.address || null,
    paidAmount: 0,
    outstandingAmount: 0,
    isActive: true,
    updatedAt: now,
    synced: false,
  };

  await db.customers.add(offlineCustomer);
  await syncManager.queueChange('customers', 'CREATE', offlineCustomer);

  return { success: true, id };
}

export async function updateCustomerOffline(id: string, input: Partial<CreateCustomerInput>): Promise<{ success: boolean }> {
  const existing = await db.customers.get(id);
  if (!existing) return { success: false };

  const updates = {
    ...input,
    updatedAt: new Date().toISOString(),
    synced: false,
  };

  await db.customers.update(id, updates);
  await syncManager.queueChange('customers', 'UPDATE', { id, ...updates });

  return { success: true };
}

export async function deleteCustomerOffline(id: string): Promise<{ success: boolean }> {
  const existing = await db.customers.get(id);
  if (!existing) return { success: false };

  await db.customers.update(id, { isActive: false, synced: false });
  await syncManager.queueChange('customers', 'DELETE', { id });

  return { success: true };
}

// ============================================================================
// Offline CRUD Operations - Categories
// ============================================================================

export interface CreateCategoryInput {
  name: string;
}

export async function createCategoryOffline(input: CreateCategoryInput): Promise<{ success: boolean; id: string }> {
  const id = createId();

  const offlineCategory: OfflineCategory = {
    id,
    name: input.name,
    synced: false,
  };

  await db.categories.add(offlineCategory);
  await syncManager.queueChange('categories', 'CREATE', offlineCategory);

  return { success: true, id };
}

export async function updateCategoryOffline(id: string, input: Partial<CreateCategoryInput>): Promise<{ success: boolean }> {
  const existing = await db.categories.get(id);
  if (!existing) return { success: false };

  await db.categories.update(id, { ...input, synced: false });
  await syncManager.queueChange('categories', 'UPDATE', { id, ...input });

  return { success: true };
}

export async function deleteCategoryOffline(id: string): Promise<{ success: boolean }> {
  const existing = await db.categories.get(id);
  if (!existing) return { success: false };

  await db.categories.delete(id);
  await syncManager.queueChange('categories', 'DELETE', { id });

  return { success: true };
}

// ============================================================================
// Order Operations (Offline)
// ============================================================================

interface CreateOfflineOrderInput {
  items: {
    itemId: string;
    productName: string;
    categoryName: string | null;
    quantity: number;
    appliedPrice: number;
    costPrice: number | null;
    discount: number;
    priceType: 'RETAIL' | 'WHOLESALE';
  }[];
  customerId: string | null;
  walkInCustomer: {
    name: string;
    phone: string;
    cnic: string;
  } | null;
  isWholesale: boolean;
  paymentMethod: 'CASH' | 'CARD' | 'ONLINE_PAYMENT';
  amountPaid: number;
  subtotal: number;
  totalDiscount: number;
  total: number;
}

// Local invoice counter stored in IndexedDB
async function getNextLocalInvoiceId(): Promise<string> {
  const COUNTER_KEY = 'local_invoice_counter';
  let counter = localStorage.getItem(COUNTER_KEY);
  let nextValue = counter ? parseInt(counter, 10) + 1 : 1;
  localStorage.setItem(COUNTER_KEY, String(nextValue));
  
  // Prefix with 'OFF-' to identify offline-generated invoices
  return `OFF-${String(nextValue).padStart(5, '0')}`;
}

export async function createOfflineOrder(input: CreateOfflineOrderInput): Promise<{ 
  success: boolean; 
  invoiceId?: string; 
  orderId?: string;
  error?: string 
}> {
  try {
    const orderId = createId();
    const invoiceId = await getNextLocalInvoiceId();
    const outstanding = Math.max(0, input.total - input.amountPaid);

    // Determine order status
    let orderStatus: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' = 'PENDING';
    if (input.amountPaid >= input.total) {
      orderStatus = 'FULLY_PAID';
    } else if (input.amountPaid > 0) {
      orderStatus = 'PARTIALLY_PAID';
    }

    // Create order items
    const orderItems: OfflineOrderItem[] = input.items.map((item) => ({
      id: createId(),
      orderId,
      itemId: item.itemId,
      productNameSnapshot: item.productName,
      quantity: item.quantity,
      priceType: item.priceType,
      appliedPrice: item.appliedPrice,
      discountAmount: item.discount,
      itemTotal: item.appliedPrice * item.quantity - item.discount,
    }));

    // Create the order
    const order: OfflineOrder = {
      id: orderId,
      invoiceId,
      customerId: input.customerId,
      walkInCustomerName: input.walkInCustomer?.name || null,
      subtotal: input.subtotal,
      totalDiscount: input.totalDiscount,
      totalPrice: input.total,
      paidAmount: input.amountPaid,
      outstandingAmount: outstanding,
      paymentMethod: input.paymentMethod,
      orderStatus,
      isWholesale: input.isWholesale,
      createdAt: new Date().toISOString(),
      items: orderItems,
      synced: false,
    };

    // Save to IndexedDB
    await db.orders.add(order);

    // Update local stock for each item
    for (const item of input.items) {
      await updateLocalStock(item.itemId, -item.quantity);
    }

    // Add to sync queue
    await db.syncQueue.add({
      table: 'orders',
      action: 'CREATE',
      data: {
        ...order,
        // Include walk-in customer details for sync
        walkInCustomerPhone: input.walkInCustomer?.phone || null,
        walkInCustomerCNIC: input.walkInCustomer?.cnic || null,
      },
      timestamp: Date.now(),
    });

    console.log('✅ Offline order created:', invoiceId);
    return { success: true, invoiceId, orderId };
  } catch (error) {
    console.error('❌ Failed to create offline order:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// Sync Queue Operations
// ============================================================================

export async function getPendingSyncCount(): Promise<number> {
  return db.syncQueue.count();
}

export async function getUnsyncedOrders(): Promise<OfflineOrder[]> {
  return db.orders.filter((o) => Boolean(!o.synced)).toArray();
}

export async function markOrderSynced(orderId: string): Promise<void> {
  await db.orders.update(orderId, { synced: true });
}

export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear();
}

// ============================================================================
// Utility
// ============================================================================

export async function isDataHydrated(): Promise<boolean> {
  const itemCount = await db.items.count();
  return itemCount > 0;
}

export async function clearAllOfflineData(): Promise<void> {
  await Promise.all([
    db.items.clear(),
    db.customers.clear(),
    db.categories.clear(),
    db.orders.clear(),
    db.syncQueue.clear(),
    db.dashboardCache.clear(),
  ]);
  localStorage.removeItem('local_invoice_counter');
}

// ============================================================================
// List All Data Functions (for page displays)
// ============================================================================

export async function getAllItems(): Promise<(OfflineItem & { categoryName?: string })[]> {
  const items = await db.items.toArray();
  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));
  
  return items.map(item => ({
    ...item,
    categoryName: item.categoryId ? categoryMap.get(item.categoryId) || undefined : undefined,
  }));
}

export async function getAllActiveItems(): Promise<(OfflineItem & { categoryName?: string })[]> {
  const items = await db.items.filter((i) => Boolean(i.isActive)).toArray();
  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));
  
  return items.map(item => ({
    ...item,
    categoryName: item.categoryId ? categoryMap.get(item.categoryId) || undefined : undefined,
  }));
}

export async function getAllCategories(): Promise<OfflineCategory[]> {
  return db.categories.toArray();
}

export async function getAllCustomers(): Promise<OfflineCustomer[]> {
  return db.customers.toArray();
}

export async function getAllActiveCustomers(): Promise<OfflineCustomer[]> {
  return db.customers.filter((c) => Boolean(c.isActive)).toArray();
}

export async function getAllOrders(): Promise<OfflineOrder[]> {
  const orders = await db.orders.toArray();
  // Sort by createdAt descending (newest first)
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getOfflineDashboardStats() {
  const cache = await getDashboardCache();
  
  if (cache) {
    return {
      metrics: {
        revenue: cache.todaySales,
        ordersCount: cache.todayOrders,
        lowStockCount: cache.lowStockCount,
        customerCount: cache.totalCustomers,
      },
      recentSales: cache.recentOrders || []
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayRevenue = 0;
  let todayOrders = 0;

  // Use Dexie's each to prevent huge arrays in memory
  await db.orders.filter(o => new Date(o.createdAt) >= today).each(o => {
    todayOrders++;
    todayRevenue += o.totalPrice;
  });

  const lowStockCount = await db.items.filter((i) => Boolean(i.isActive && i.quantity <= (i.minStockLevel || 5))).count();
  const customerCount = await db.customers.count();
  
  // Recent orders
  const recentSales = await db.orders.orderBy('createdAt').reverse().limit(5).toArray();

  return {
    metrics: {
      revenue: todayRevenue,
      ordersCount: todayOrders,
      lowStockCount,
      customerCount,
    },
    recentSales
  };
}

export async function getOfflineReportStats(from: string, to: string) {
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  
  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(23, 59, 59, 999);

  let query = db.orders.toCollection();

  if (fromDate || toDate) {
    query = db.orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      if (fromDate && orderDate < fromDate) return false;
      if (toDate && orderDate > toDate) return false;
      return true;
    });
  }

  // We sort offline reports client side after fetching, but maybe we can just reverse() here if we want descending
  const orders = await query.toArray();
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPaginatedOfflineOrders({
  search,
  from,
  to,
  page = 1,
  limit = 20,
}: {
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  let collection = db.orders.toCollection();

  // If there's a search term, we need to filter
  if (search || from || to) {
    const searchLower = search ? search.toLowerCase() : '';
    
    collection = db.orders.filter((order) => {
      let matchesSearch = true;
      if (searchLower) {
        matchesSearch = 
          order.invoiceId.toLowerCase().includes(searchLower) ||
          (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
          (order.walkInCustomerName && order.walkInCustomerName.toLowerCase().includes(searchLower)) ||
          false;
      }

      let matchesDate = true;
      const orderDate = new Date(order.createdAt);
      if (from) {
        const fromDate = new Date(`${from}T00:00:00.000Z`);
        matchesDate = matchesDate && orderDate >= fromDate;
      }
      if (to) {
        const toDate = new Date(`${to}T23:59:59.999Z`);
        matchesDate = matchesDate && orderDate <= toDate;
      }

      return matchesSearch && matchesDate;
    });
  }

  // To properly sort and paginate Dexie results that use filter(), 
  // we either have to use a sorted index and then filter, or fetch all filtered and then sort/slice.
  // Given we are sorting by createdAt descending (which isn't necessarily indexed for this exact complex query),
  // fetching filtered into memory, sorting, and slicing is the easiest.
  // (Offline orders won't be 10,000s, usually a few hundred unsynced or cached).
  
  const allFiltered = await collection.toArray();
  allFiltered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalRecords = allFiltered.length;
  const totalPages = Math.ceil(totalRecords / limit);
  const offset = (page - 1) * limit;
  const data = allFiltered.slice(offset, offset + limit);

  return {
    data,
    metadata: {
      hasMore: page < totalPages,
      totalRecords,
      currentPage: page,
    }
  };
}

export async function getOrderById(orderId: string): Promise<OfflineOrder | undefined> {
  return db.orders.get(orderId);
}

export async function getOrderByInvoiceId(invoiceId: string): Promise<OfflineOrder | undefined> {
  return db.orders.where('invoiceId').equals(invoiceId).first();
}

export async function getOrdersByStatus(status: OfflineOrder['orderStatus']): Promise<OfflineOrder[]> {
  return db.orders.filter((o) => o.orderStatus === status).toArray();
}

export async function getDashboardCache(): Promise<DashboardCache | undefined> {
  return db.dashboardCache.get('dashboard_metrics');
}

export async function getLowStockItems(): Promise<OfflineItem[]> {
  return db.items.filter((item) => {
    return Boolean(item.isActive && item.quantity <= item.minStockLevel);
  }).toArray();
}

export async function getOrdersForCustomer(customerId: string): Promise<OfflineOrder[]> {
  return db.orders.filter((o) => o.customerId === customerId).toArray();
}

// ============================================================================
// Suppliers, Employees, Purchase Orders (for page displays)
// ============================================================================

export async function getAllSuppliers(): Promise<OfflineSupplier[]> {
  return db.suppliers.toArray();
}

export async function getAllActiveSuppliers(): Promise<OfflineSupplier[]> {
  return db.suppliers.filter((s) => Boolean(s.isActive)).toArray();
}

export async function getAllEmployees(): Promise<OfflineEmployee[]> {
  return db.employees.toArray();
}

export async function getAllActiveEmployees(): Promise<OfflineEmployee[]> {
  return db.employees.filter((e) => Boolean(e.isActive)).toArray();
}

export async function getAllPurchaseOrders(): Promise<OfflinePurchaseOrder[]> {
  const purchases = await db.purchaseOrders.toArray();
  // Sort by purchaseDate descending (newest first)
  return purchases.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
}

// ============================================================================
// Offline CRUD Operations - Suppliers
// ============================================================================

export interface CreateSupplierInput {
  name: string;
  phone: string;
  address?: string | null;
}

export async function createSupplierOffline(input: CreateSupplierInput): Promise<{ success: boolean; id: string }> {
  const id = createId();

  const offlineSupplier: OfflineSupplier = {
    id,
    name: input.name,
    phone: input.phone,
    address: input.address || null,
    totalAmount: 0,
    amountPaid: 0,
    remainingAmount: 0,
    isActive: true,
    synced: false,
  };

  await db.suppliers.add(offlineSupplier);
  await syncManager.queueChange('suppliers', 'CREATE', offlineSupplier);

  return { success: true, id };
}

export async function updateSupplierOffline(id: string, input: Partial<CreateSupplierInput>): Promise<{ success: boolean }> {
  const existing = await db.suppliers.get(id);
  if (!existing) return { success: false };

  await db.suppliers.update(id, { ...input, synced: false });
  await syncManager.queueChange('suppliers', 'UPDATE', { id, ...input });

  return { success: true };
}

export async function deleteSupplierOffline(id: string): Promise<{ success: boolean }> {
  const existing = await db.suppliers.get(id);
  if (!existing) return { success: false };

  await db.suppliers.update(id, { isActive: false, synced: false });
  await syncManager.queueChange('suppliers', 'DELETE', { id });

  return { success: true };
}

// ============================================================================
// Offline CRUD Operations - Employees
// ============================================================================

export interface CreateEmployeeInput {
  name: string;
  cnic: string;
  phone?: string | null;
  salary: number;
}

export async function createEmployeeOffline(input: CreateEmployeeInput): Promise<{ success: boolean; id: string }> {
  const id = createId();

  const offlineEmployee: OfflineEmployee = {
    id,
    name: input.name,
    cnic: input.cnic,
    phone: input.phone || null,
    salary: input.salary,
    isActive: true,
    synced: false,
  };

  await db.employees.add(offlineEmployee);
  await syncManager.queueChange('employees', 'CREATE', offlineEmployee);

  return { success: true, id };
}

export async function updateEmployeeOffline(id: string, input: Partial<CreateEmployeeInput>): Promise<{ success: boolean }> {
  const existing = await db.employees.get(id);
  if (!existing) return { success: false };

  await db.employees.update(id, { ...input, synced: false });
  await syncManager.queueChange('employees', 'UPDATE', { id, ...input });

  return { success: true };
}

export async function deleteEmployeeOffline(id: string): Promise<{ success: boolean }> {
  const existing = await db.employees.get(id);
  if (!existing) return { success: false };

  await db.employees.update(id, { isActive: false, synced: false });
  await syncManager.queueChange('employees', 'DELETE', { id });

  return { success: true };
}

export async function getSupplierById(id: string) {
  return await db.suppliers.get(id);
}

// ============================================================================
// Offline CRUD Operations - Purchase Orders
// ============================================================================

export interface CreatePurchaseOrderInput {
  supplierId: string;
  items: {
    itemId: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
  }[];
  totalAmount: number;
  amountPaid: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  notes?: string;
}

export async function createPurchaseOrderOffline(input: CreatePurchaseOrderInput): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supplier = await db.suppliers.get(input.supplierId);
    if (!supplier) return { success: false, error: 'Supplier not found locally' };

    const id = createId();
    const now = new Date().toISOString();

    const offlinePO: OfflinePurchaseOrder = {
      id,
      supplierId: input.supplierId,
      supplierName: supplier.name,
      purchaseDate: now,
      totalAmount: input.totalAmount,
      paidAmount: input.amountPaid,
      remainingAmount: Math.max(0, input.totalAmount - input.amountPaid),
      itemCount: input.items.length,
      synced: false,
    };

    // Save to IndexedDB
    await db.purchaseOrders.add(offlinePO);

    // Update local stock and prices
    for (const item of input.items) {
      await updateLocalStock(item.itemId, item.quantity);
      // Update local item costPrice/retailPrice if possible
      const offlineItem = await db.items.get(item.itemId);
      if (offlineItem) {
         await db.items.update(item.itemId, {
            costPrice: item.costPrice,
            retailPrice: item.sellingPrice
         });
      }
    }

    // Update local supplier balance
    await db.suppliers.update(input.supplierId, {
      totalAmount: supplier.totalAmount + input.totalAmount,
      amountPaid: supplier.amountPaid + input.amountPaid,
      remainingAmount: supplier.remainingAmount + Math.max(0, input.totalAmount - input.amountPaid)
    });

    // Add to sync queue
    await syncManager.queueChange('purchaseOrders', 'CREATE', {
      id,
      supplierId: input.supplierId,
      totalAmount: input.totalAmount,
      amountPaid: input.amountPaid,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      items: input.items,
      purchaseDate: now
    });

    return { success: true, id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deletePurchaseOrderOffline(id: string): Promise<{ success: boolean }> {
  const existing = await db.purchaseOrders.get(id);
  if (!existing) return { success: false };

  // Sync queue deletion
  await syncManager.queueChange('purchaseOrders', 'DELETE', { id, supplierId: existing.supplierId });

  await db.purchaseOrders.delete(id);
  
  return { success: true };
}

export async function getPaginatedOfflinePurchaseOrders(supplierId: string, page = 1, limit = 10, search = '', from = '', to = '') {
  let collection = db.purchaseOrders.where('supplierId').equals(supplierId);

  // Note: Dexie toArray to do manual sorting/filtering
  let allFiltered = await collection.toArray();
  
  if (from || to) {
    allFiltered = allFiltered.filter(po => {
       const poDate = new Date(po.purchaseDate);
       let matchesDate = true;
       if (from) {
         const fromDate = new Date(`${from}T00:00:00.000Z`);
         matchesDate = matchesDate && poDate >= fromDate;
       }
       if (to) {
         const toDate = new Date(`${to}T23:59:59.999Z`);
         matchesDate = matchesDate && poDate <= toDate;
       }
       return matchesDate;
    });
  }
  
  // Sort descending
  allFiltered.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

  const totalRecords = allFiltered.length;
  const totalPages = Math.ceil(totalRecords / limit);
  const offset = (page - 1) * limit;
  const data = allFiltered.slice(offset, offset + limit);

  // We need to return an array shaped like the API. The API returns full purchase order objects with items.
  // Our offlinePO only has itemCount. The card Component expects:
  // { id, items: [ ... ], purchaseDate, totalAmount, amountPaid, remainingAmount, supplier: { name, ... }, payments: [] }
  // So we map it to match PurchaseOrderCard shape so it doesn't crash.
  const mappedData = data.map(po => ({
    id: po.id,
    supplierId: po.supplierId,
    purchaseDate: po.purchaseDate,
    totalAmount: String(po.totalAmount),
    paidAmount: String(po.paidAmount),
    remainingAmount: String(po.remainingAmount),
    items: [], // Since we don't store items locally, list is empty offline
    supplier: { name: po.supplierName || 'Unknown' },
    payments: [] 
  }));

  return {
    data: mappedData,
    metadata: {
      hasMore: page < totalPages,
      totalRecords,
      currentPage: page,
    }
  };
}
