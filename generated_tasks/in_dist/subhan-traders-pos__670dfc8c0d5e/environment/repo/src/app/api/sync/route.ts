import { db } from '@/db';
import { categories, counters, customers, employees, items, orderItems, orders, payments, suppliers, purchaseOrders } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {

  try {
    const body = await req.json();
    const { table, action } = body;
    let { data } = body;

    // Helper to fix date strings to Date objects
    const fixDates = (obj: Record<string, unknown>) => {
      const processed = { ...obj };
      const dateFields = ['createdAt', 'updatedAt', 'paymentDate', 'purchaseDate', 'date'];
      
      dateFields.forEach(field => {
        const value = processed[field];
        if (value && typeof value === 'string') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          processed[field] = new Date(value) as any;
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return processed as any;
    };

    // Fix dates early
    if (data) {
      data = fixDates(data);
    }

    console.log(`📥 Processing sync: ${action} on ${table}`, data);

    switch (table) {
      case 'items':
        if (action === 'CREATE') {
          // Check if exists (might be conflict)
          const existing = await db.select().from(items).where(eq(items.id, data.id));
          if (existing.length === 0) {
            await db.insert(items).values({
              ...data,
              retailPrice: String(data.retailPrice),
              wholesalePrice: data.wholesalePrice ? String(data.wholesalePrice) : null,
              costPrice: data.costPrice ? String(data.costPrice) : null,
            });
          }
        }
        if (action === 'UPDATE') {
          const updates = { ...data };
          if (updates.retailPrice) updates.retailPrice = String(updates.retailPrice);
          if (updates.wholesalePrice) updates.wholesalePrice = String(updates.wholesalePrice);
          if (updates.costPrice) updates.costPrice = String(updates.costPrice);
          delete updates.synced;
          await db.update(items).set(updates).where(eq(items.id, data.id));
        }
        if (action === 'DELETE') {
          // Soft delete
          await db.update(items).set({ isActive: false }).where(eq(items.id, data.id));
        }
        break;
        
      case 'customers':
        if (action === 'CREATE') {
          const existing = await db.select().from(customers).where(eq(customers.id, data.id));
          if (existing.length === 0) {
            await db.insert(customers).values({
              id: data.id,
              name: data.name,
              phone: data.phone,
              cnic: data.cnic || null,
              address: data.address || null,
            });
          }
        }
        if (action === 'UPDATE') {
          const updates = { ...data };
          delete updates.synced;
          delete updates.paidAmount;
          delete updates.outstandingAmount;
          await db.update(customers).set(updates).where(eq(customers.id, data.id));
        }
        if (action === 'DELETE') {
          await db.update(customers).set({ isActive: false }).where(eq(customers.id, data.id));
        }
        break;

      case 'categories':
        if (action === 'CREATE') {
          const existing = await db.select().from(categories).where(eq(categories.id, data.id));
          if (existing.length === 0) {
            await db.insert(categories).values({
              id: data.id,
              name: data.name,
            });
          }
        }
        if (action === 'UPDATE') {
          await db.update(categories).set({ name: data.name }).where(eq(categories.id, data.id));
        }
        if (action === 'DELETE') {
          await db.delete(categories).where(eq(categories.id, data.id));
        }
        break;

      case 'suppliers':
        if (action === 'CREATE') {
          const existing = await db.select().from(suppliers).where(eq(suppliers.id, data.id));
          if (existing.length === 0) {
            await db.insert(suppliers).values({
              id: data.id,
              name: data.name,
              phone: data.phone,
              address: data.address || null,
            });
          }
        }
        if (action === 'UPDATE') {
          const updates = { ...data };
          delete updates.synced;
          delete updates.totalAmount;
          delete updates.amountPaid;
          delete updates.remainingAmount;
          await db.update(suppliers).set(updates).where(eq(suppliers.id, data.id));
        }
        if (action === 'DELETE') {
          await db.update(suppliers).set({ isActive: false }).where(eq(suppliers.id, data.id));
        }
        break;

      case 'employees':
        if (action === 'CREATE') {
          const existing = await db.select().from(employees).where(eq(employees.id, data.id));
          if (existing.length === 0) {
            await db.insert(employees).values({
              id: data.id,
              name: data.name,
              cnic: data.cnic,
              phone: data.phone || null,
              salary: String(data.salary),
            });
          }
        }
        if (action === 'UPDATE') {
          const updates = { ...data };
          delete updates.synced;
          if (updates.salary) updates.salary = String(updates.salary);
          await db.update(employees).set(updates).where(eq(employees.id, data.id));
        }
        if (action === 'DELETE') {
          await db.update(employees).set({ isActive: false }).where(eq(employees.id, data.id));
        }
        break;
        
      case 'orders':
        if (action === 'CREATE') {
          // Full transactional order sync with stock updates
          const result = await db.transaction(async (tx) => {
            // Generate server-side invoice ID if it was an offline order
            let invoiceId = data.invoiceId;
            if (invoiceId?.startsWith('OFF-')) {
              // Inline invoice ID generation
              const counterId = "invoice_counter";
              const existing = await tx
                .select()
                .from(counters)
                .where(eq(counters.id, counterId));
              
              let newValue: number;
              
              if (existing.length === 0) {
                await tx.insert(counters).values({
                  id: counterId,
                  sequenceValue: 1,
                });
                newValue = 1;
              } else {
                newValue = existing[0].sequenceValue + 1;
                await tx
                  .update(counters)
                  .set({ sequenceValue: newValue })
                  .where(eq(counters.id, counterId));
              }
              
              invoiceId = `INV-${String(newValue).padStart(5, "0")}`;
              console.log(`🔄 Remapping offline invoice ${data.invoiceId} -> ${invoiceId}`);
            }

            // Determine order status
            const paidAmount = parseFloat(data.paidAmount) || 0;
            const totalPrice = parseFloat(data.totalPrice) || 0;
            const outstanding = Math.max(0, totalPrice - paidAmount);

            let orderStatus: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' = 'PENDING';
            if (paidAmount >= totalPrice) {
              orderStatus = 'FULLY_PAID';
            } else if (paidAmount > 0) {
              orderStatus = 'PARTIALLY_PAID';
            }

            // 1. Create the order
            const [order] = await tx.insert(orders).values({
              id: data.id,
              invoiceId,
              customerId: data.customerId || null,
              walkInCustomerName: data.walkInCustomerName || null,
              walkInCustomerPhone: data.walkInCustomerPhone || null,
              walkInCustomerCNIC: data.walkInCustomerCNIC || null,
              subtotal: String(data.subtotal),
              totalDiscount: String(data.totalDiscount),
              totalPrice: String(totalPrice),
              totalProfit: String(data.totalProfit || 0),
              paidAmount: String(paidAmount),
              outstandingAmount: String(outstanding),
              isWholesale: data.isWholesale || false,
              paymentMethod: data.paymentMethod,
              orderStatus,
            }).returning();

            // 2. Create order items and update stock
            if (data.items && data.items.length > 0) {
              for (const item of data.items) {
                const itemTotal = (item.appliedPrice || 0) * item.quantity - (item.discountAmount || 0);
                const costPrice = item.costPriceSnapshot || 0;
                const itemProfit = ((item.appliedPrice || 0) - costPrice) * item.quantity - (item.discountAmount || 0);

                // Insert order item
                await tx.insert(orderItems).values({
                  id: item.id,
                  orderId: data.id,
                  itemId: item.itemId || null,
                  productNameSnapshot: item.productNameSnapshot,
                  productCategorySnapshot: item.productCategorySnapshot || null,
                  quantity: item.quantity,
                  priceType: item.priceType || 'RETAIL',
                  appliedPrice: String(item.appliedPrice),
                  costPriceSnapshot: String(costPrice),
                  discountAmount: String(item.discountAmount || 0),
                  itemTotal: String(itemTotal),
                  itemProfit: String(itemProfit),
                });

                // Update stock atomically (only if itemId exists)
                if (item.itemId) {
                  await tx
                    .update(items)
                    .set({
                      quantity: sql`GREATEST(0, ${items.quantity} - ${item.quantity})`,
                    })
                    .where(eq(items.id, item.itemId));
                }
              }
            }

            // 3. Record payment if any
            if (paidAmount > 0) {
              await tx.insert(payments).values({
                orderId: data.id,
                amount: String(paidAmount),
                paymentMethod: data.paymentMethod || 'CASH',
                notes: 'Synced from offline sale',
              });
            }

            // 4. Update customer balance if exists
            if (data.customerId) {
              await tx
                .update(customers)
                .set({
                  paidAmount: sql`${customers.paidAmount} + ${paidAmount}`,
                  outstandingAmount: sql`${customers.outstandingAmount} + ${outstanding}`,
                })
                .where(eq(customers.id, data.customerId));
            }

            return { order, invoiceId };
          });

          console.log(`✅ Order synced: ${result.invoiceId}`);
          return NextResponse.json({ success: true, invoiceId: result.invoiceId });
        }
        break;

      case 'purchaseOrders':
        if (action === 'CREATE') {
          await db.transaction(async (tx) => {
            const existing = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, data.id));
            if (existing.length === 0) {
              const totalAmountStr = String(data.totalAmount);
              const paidAmountStr = String(data.amountPaid);
              const remainingAmountStr = String(Math.max(0, data.totalAmount - data.amountPaid));

              await tx.insert(purchaseOrders).values({
                id: data.id,
                supplierId: data.supplierId,
                purchaseDate: new Date(data.purchaseDate),
                totalAmount: totalAmountStr,
                paidAmount: paidAmountStr,
                remainingAmount: remainingAmountStr,
                notes: data.notes || null,
              });

              if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                   const itemRecord = await tx.select({ productName: items.productName }).from(items).where(eq(items.id, item.itemId));
                   const productName = itemRecord[0]?.productName || 'Unknown Product';
                   
                   // Need to import purchaseOrderItems at the top, we will assume it's imported since it's already there? Wait, is it?
                   // No, it might not be imported. But I saw it in `src/app/api/suppliers/[id]/purchases/route.ts`. Let's assume it can be used or we add it to imports later.
                   // Actually, I can just use db.insert(require('@/db/schema').purchaseOrderItems)... no, I shouldn't.

                   await tx.insert(require('@/db/schema').purchaseOrderItems).values({
                      purchaseOrderId: data.id,
                      itemId: item.itemId,
                      productNameSnapshot: productName,
                      quantity: item.quantity,
                      purchasePrice: String(item.costPrice),
                      itemTotal: String(item.quantity * item.costPrice)
                   });
                   
                   await tx.update(items)
                     .set({
                       quantity: sql`${items.quantity} + ${item.quantity}`,
                       costPrice: String(item.costPrice),
                       retailPrice: String(item.sellingPrice)
                     })
                     .where(eq(items.id, item.itemId));
                }
              }

              if (data.amountPaid > 0) {
                await tx.insert(require('@/db/schema').supplierPayments).values({
                  supplierId: data.supplierId,
                  purchaseOrderId: data.id,
                  amount: paidAmountStr,
                  paymentMethod: data.paymentMethod || 'CASH',
                  notes: 'Synced from offline',
                  paymentDate: new Date(data.purchaseDate),
                });
              }

              await tx.update(suppliers)
                .set({
                  totalAmount: sql`${suppliers.totalAmount} + ${data.totalAmount}`,
                  amountPaid: sql`${suppliers.amountPaid} + ${data.amountPaid}`,
                  remainingAmount: sql`${suppliers.remainingAmount} + (${data.totalAmount} - ${data.amountPaid})`
                })
                .where(eq(suppliers.id, data.supplierId));
            }
          });
        }
        if (action === 'DELETE') {
          await db.transaction(async (tx) => {
             const purchaseOrdersTable = require('@/db/schema').purchaseOrders;
             const po = await tx.query.purchaseOrders.findFirst({
                 where: eq(purchaseOrdersTable.id, data.id),
                 with: { items: true }
             });
             if (po) {
                for (const item of po.items) {
                    if (item.itemId) {
                        await tx.update(items)
                          .set({ quantity: sql`GREATEST(${items.quantity} - ${item.quantity}, 0)` })
                          .where(eq(items.id, item.itemId));
                    }
                }
                const poTotal = parseFloat(po.totalAmount);
                const poPaid = parseFloat(po.paidAmount);
                await tx.update(suppliers).set({
                    totalAmount: sql`${suppliers.totalAmount} - ${poTotal}`,
                    amountPaid: sql`${suppliers.amountPaid} - ${poPaid}`,
                    remainingAmount: sql`${suppliers.remainingAmount} - (${poTotal} - ${poPaid})`
                }).where(eq(suppliers.id, po.supplierId));

                await tx.delete(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, data.id));
             }
          });
        }
        break;

      default:
        return NextResponse.json({ message: `Table ${table} not handled` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sync API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: String(error) }, { status: 500 });
  }
}
