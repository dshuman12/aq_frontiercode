import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import { boolean, decimal, index, integer, json, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Enums
export const roleEnum = pgEnum('role', ['ADMIN', 'MANAGER', 'CASHIER', 'INVENTORY_STAFF']);
export const priceTypeEnum = pgEnum('price_type', ['RETAIL', 'WHOLESALE']);
export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'CARD', 'ONLINE_PAYMENT']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'PARTIALLY_PAID', 'FULLY_PAID', 'CANCELLED']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY']);
export const paymentStatusEnum = pgEnum('payment_status', ['PAID', 'UNPAID']);

// Helper
const id = (name: string) => text(name).primaryKey().$defaultFn(() => createId());
const timestampFields = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
};

// Users
export const users = pgTable('users', {
  id: id('id'),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  role: roleEnum('role').default('CASHIER').notNull(),
  cnic: text('cnic').unique(),
  imgUrl: text('img_url'),
  salary: decimal('salary', { precision: 10, scale: 2 }),
  ...timestampFields,
});

export const usersRelations = relations(users, ({ many }) => ({
  ordersCreated: many(orders),
  attendance: many(attendance),
}));

// Categories
export const categories = pgTable('categories', {
  id: id('id'),
  name: text('name').unique().notNull(),
  ...timestampFields,
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  items: many(items),
}));

// Items (Products)
export const items = pgTable('items', {
  id: id('id'),
  productName: text('product_name').unique().notNull(),
  sku: text('sku').unique(),
  barcode: text('barcode').unique(),
  categoryId: text('category_id').references(() => categories.id),
  quantity: integer('quantity').default(0).notNull(),
  retailPrice: decimal('retail_price', { precision: 10, scale: 2 }).notNull(),
  wholesalePrice: decimal('wholesale_price', { precision: 10, scale: 2 }),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  minStockLevel: integer('min_stock_level').default(5).notNull(),
  imgUrl: text('img_url'),
  priceType: priceTypeEnum('price_type').default('RETAIL').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestampFields,
}, (table) => ({
  categoryIdIdx: index('items_category_id_idx').on(table.categoryId),
  categoryActiveIdx: index('items_category_active_idx').on(table.categoryId, table.isActive),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  category: one(categories, { fields: [items.categoryId], references: [categories.id] }),
  orderItems: many(orderItems),
  purchaseOrderItems: many(purchaseOrderItems),
  stockAdjustments: many(stockAdjustments),
}));

// Customers
export const customers = pgTable('customers', {
  id: id('id'),
  name: text('name').notNull(),
  cnic: text('cnic').unique(),
  phone: text('phone').unique().notNull(),
  address: text('address'),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  outstandingAmount: decimal('outstanding_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  imgUrl: text('img_url'),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestampFields,
});

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

// Orders
export const orders = pgTable('orders', {
  id: id('id'),
  invoiceId: text('invoice_id').unique().notNull(),
  businessName: text('business_name'),
  location: text('location'),
  phoneNum: text('phone_num'),
  customerId: text('customer_id').references(() => customers.id),
  walkInCustomerName: text('walk_in_customer_name'),
  walkInCustomerCNIC: text('walk_in_customer_cnic'),
  walkInCustomerPhone: text('walk_in_customer_phone'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
  totalDiscount: decimal('total_discount', { precision: 12, scale: 2 }).default('0').notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).default('0').notNull(),
  totalProfit: decimal('total_profit', { precision: 12, scale: 2 }).default('0').notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  outstandingAmount: decimal('outstanding_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  isWholesale: boolean('is_wholesale').default(false).notNull(),
  paymentMethod: paymentMethodEnum('payment_method'),
  orderStatus: orderStatusEnum('order_status').default('PENDING').notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdById: text('created_by_id').references(() => users.id),
  ...timestampFields,
}, (table) => ({
  customerIdIdx: index('orders_customer_id_idx').on(table.customerId),
  createdByIdIdx: index('orders_created_by_id_idx').on(table.createdById),
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  statusCreatedAtIdx: index('orders_status_created_at_idx').on(table.orderStatus, table.createdAt),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  createdBy: one(users, { fields: [orders.createdById], references: [users.id] }),
  items: many(orderItems),
  payments: many(payments),
}));

// Order Items
export const orderItems = pgTable('order_items', {
  id: id('id'),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  itemId: text('item_id').references(() => items.id),
  productNameSnapshot: text('product_name_snapshot').notNull(),
  productCategorySnapshot: text('product_category_snapshot'),
  quantity: integer('quantity').notNull(),
  priceType: priceTypeEnum('price_type').default('RETAIL').notNull(),
  appliedPrice: decimal('applied_price', { precision: 10, scale: 2 }).notNull(),
  costPriceSnapshot: decimal('cost_price_snapshot', { precision: 10, scale: 2 }).default('0').notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  itemTotal: decimal('item_total', { precision: 12, scale: 2 }).notNull(),
  itemProfit: decimal('item_profit', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
  itemIdIdx: index('order_items_item_id_idx').on(table.itemId),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  item: one(items, { fields: [orderItems.itemId], references: [items.id] }),
}));

// Payments
export const payments = pgTable('payments', {
  id: id('id'),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  notes: text('notes'),
  paymentDate: timestamp('payment_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index('payments_order_id_idx').on(table.orderId),
  paymentDateIdx: index('payments_payment_date_idx').on(table.paymentDate),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

// Suppliers
export const suppliers = pgTable('suppliers', {
  id: id('id'),
  name: text('name').unique().notNull(),
  phone: text('phone').notNull(),
  address: text('address'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  amountPaid: decimal('amount_paid', { precision: 12, scale: 2 }).default('0').notNull(),
  remainingAmount: decimal('remaining_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestampFields,
});

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
  payments: many(supplierPayments),
}));

// Supplier Payments - Track partial payments to suppliers per purchase order
export const supplierPayments = pgTable('supplier_payments', {
  id: id('id'),
  supplierId: text('supplier_id').references(() => suppliers.id, { onDelete: 'cascade' }).notNull(),
  purchaseOrderId: text('purchase_order_id').references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  notes: text('notes'),
  paymentDate: timestamp('payment_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  supplierIdIdx: index('supplier_payments_supplier_id_idx').on(table.supplierId),
  purchaseOrderIdIdx: index('supplier_payments_po_id_idx').on(table.purchaseOrderId),
}));

export const supplierPaymentsRelations = relations(supplierPayments, ({ one }) => ({
  supplier: one(suppliers, { fields: [supplierPayments.supplierId], references: [suppliers.id] }),
  purchaseOrder: one(purchaseOrders, { fields: [supplierPayments.purchaseOrderId], references: [purchaseOrders.id] }),
}));

// Purchase Orders
export const purchaseOrders = pgTable('purchase_orders', {
  id: id('id'),
  supplierId: text('supplier_id').references(() => suppliers.id).notNull(),
  purchaseDate: timestamp('purchase_date').defaultNow().notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  remainingAmount: decimal('remaining_amount', { precision: 12, scale: 2 }).notNull(),
  notes: text('notes'),
  ...timestampFields,
}, (table) => ({
  supplierIdIdx: index('purchase_orders_supplier_id_idx').on(table.supplierId),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
  items: many(purchaseOrderItems),
  payments: many(supplierPayments),
}));

// Purchase Order Items
export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: id('id'),
  purchaseOrderId: text('purchase_order_id').references(() => purchaseOrders.id, { onDelete: 'cascade' }).notNull(),
  itemId: text('item_id').references(() => items.id),
  productNameSnapshot: text('product_name_snapshot').notNull(),
  quantity: integer('quantity').notNull(),
  purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }).notNull(),
  itemTotal: decimal('item_total', { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
  purchaseOrderIdIdx: index('purchase_order_items_po_id_idx').on(table.purchaseOrderId),
  itemIdIdx: index('purchase_order_items_item_id_idx').on(table.itemId),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [purchaseOrderItems.purchaseOrderId], references: [purchaseOrders.id] }),
  item: one(items, { fields: [purchaseOrderItems.itemId], references: [items.id] }),
}));

// Employees
export const employees = pgTable('employees', {
  id: id('id'),
  name: text('name').notNull(),
  cnic: text('cnic').unique().notNull(),
  phone: text('phone'),
  salary: decimal('salary', { precision: 10, scale: 2 }).notNull(),
  imgUrl: text('img_url'),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestampFields,
});

export const employeesRelations = relations(employees, ({ many }) => ({
  attendance: many(attendance),
}));

// Attendance
export const attendance = pgTable('attendance', {
  id: id('id'),
  date: timestamp('date').notNull(),
  status: attendanceStatusEnum('status').notNull(),
  payment: paymentStatusEnum('payment').notNull(),
  employeeId: text('employee_id').references(() => employees.id),
  userId: text('user_id').references(() => users.id),
}, (table) => ({
  employeeIdIdx: index('attendance_employee_id_idx').on(table.employeeId),
  userIdIdx: index('attendance_user_id_idx').on(table.userId),
  dateIdx: index('attendance_date_idx').on(table.date),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  employee: one(employees, { fields: [attendance.employeeId], references: [employees.id] }),
  user: one(users, { fields: [attendance.userId], references: [users.id] }),
}));

// Business History
export const businessHistory = pgTable('business_history', {
  id: id('id'),
  year: integer('year').unique().notNull(),
  monthsData: json('months_data').notNull(), // JSON structure for months/days
  ...timestampFields,
});

export const stockAdjustments = pgTable('stock_adjustments', {
  id: id('id'),
  itemId: text('item_id').references(() => items.id).notNull(),
  quantityChange: integer('quantity_change').notNull(),
  reason: text('reason').notNull(),
  adjustedBy: text('adjusted_by'), // Could detail which user
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  itemIdIdx: index('stock_adjustments_item_id_idx').on(table.itemId),
}));

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one }) => ({
  item: one(items, { fields: [stockAdjustments.itemId], references: [items.id] }),
}));

// Counter for auto-increment invoice IDs
export const counters = pgTable('counters', {
  id: text('id').primaryKey(), // e.g., "invoice_counter"
  sequenceValue: integer('sequence_value').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

// Audit Log for tracking critical operations
export const auditLogs = pgTable('audit_logs', {
  id: id('id'),
  action: text('action').notNull(), // CREATE, UPDATE, DELETE, CANCEL, etc.
  entityType: text('entity_type').notNull(), // order, product, customer, etc.
  entityId: text('entity_id').notNull(),
  userId: text('user_id').references(() => users.id),
  beforeState: json('before_state'),
  afterState: json('after_state'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  entityTypeIdIdx: index('audit_logs_entity_type_id_idx').on(table.entityType, table.entityId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

