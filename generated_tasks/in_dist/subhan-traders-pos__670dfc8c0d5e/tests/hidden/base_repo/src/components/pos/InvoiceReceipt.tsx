"use client";

import { OfflineOrder, OfflineOrderItem } from "@/offline/db";
import { format } from "date-fns";
import { forwardRef } from "react";

const ITEMS_PER_PAGE = 15;

interface InvoiceReceiptProps {
  order: OfflineOrder;
}

/** Chunk an array into groups of `size` */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks.length === 0 ? [[]] : chunks;
}

/** Format number as Rs with 2 decimals, no space: Rs6,150.00 */
function formatRs(value: number): string {
  return `Rs${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Shared sub-components (no duplication) ──────────────────────────────────

function PageHeader() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '3mm',
      borderBottom: '2px solid #2613ceff',
      paddingBottom: '2mm'
    }}>
      {/* Logo Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1mm' }}>
        <img
          src="/logo.png"
          alt="Subhan Traders"
          style={{
            width: '35mm',
            height: 'auto',
            objectFit: 'contain'
          }}
        />
        <p style={{ fontSize: '8px', margin: 0, color: '#555', fontStyle: 'italic', textAlign: 'center', maxWidth: '38mm' }}>
          Imported Bicycles &amp; Kids Items
        </p>
      </div>

      {/* Company Details */}
      <div style={{ textAlign: 'right' }}>
        <h1 style={{
          fontSize: '18px',
          fontWeight: 'bold',
          margin: 0,
          color: '#2613ceff'
        }}>
          Subhan Traders
        </h1>
        <p style={{ fontSize: '11px', margin: '0.5mm 0', color: '#333' }}>
          GT Road, Jalawanan, Batkhela
        </p>
        <p style={{ fontSize: '11.5px', margin: '0.3mm 0 0 0', color: '#333' }}>
          Fazli Subhan Khan: 0333-9479744
        </p>
        <p style={{ fontSize: '11.5px', margin: '0.3mm 0 0 0', color: '#333' }}>
          Aziz Muhammad: 0345-9168430
        </p>
      </div>
    </div>
  );
}

function BillToSection({ order, balanceDue }: { order: OfflineOrder; balanceDue: number }) {
  const customerName = order.customerName || order.walkInCustomerName || "Walk-in Customer";
  const customerPhone = order.customerPhone || null;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '3mm',
      fontSize: '11px',
      color: '#000'
    }}>
      {/* Bill To */}
      <div>
        
        <p style={{ margin: '0.5mm 0', fontWeight: 'bold', fontSize: '12px' }}>Name: {customerName}</p>
        <p style={{ margin: '0.5mm 0', fontSize: '12px', fontWeight: 'bold' }}>Phone: {customerPhone || 'N/A'}</p>
        <p style={{
          margin: '1mm 0 0 0',
          fontSize: '12px',
          fontWeight: 'bold',
          backgroundColor: '#EDE7F6',
          padding: '0.8mm 2mm 0.8mm 0.5mm',
          display: 'inline-block',
          borderRadius: '1px',
          color: balanceDue > 0 ? '#D32F2F' : '#2613ceff',
        }}>
          Amount Due: RS {balanceDue}
        </p>
      </div>

      {/* Invoice Details */}
      <div style={{ textAlign: 'right' }}>
        <table style={{ marginLeft: 'auto', borderCollapse: 'collapse', fontSize: '11px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '0.5mm 2mm', textAlign: 'left', color: '#333', fontWeight: 'bold' }}>Invoice Number:</td>
              <td style={{ padding: '0.5mm 0', textAlign: 'right', fontWeight: 'bold' }}>{order.invoiceId}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5mm 2mm', textAlign: 'left', color: '#333', fontWeight: 'bold' }}>Invoice Date:</td>
              <td style={{ padding: '0.5mm 0', textAlign: 'right', fontWeight: 'bold' }}>{format(new Date(order.createdAt), "MMMM d, yyyy")}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5mm 2mm', textAlign: 'left', color: '#333', fontWeight: 'bold' }}>Time:</td>
              <td style={{ padding: '0.5mm 0', textAlign: 'right', fontWeight: 'bold' }}>{format(new Date(order.createdAt), "h:mm:ss a")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemsTable({ items, startIndex, pageNumber, totalPages }: { items: OfflineOrderItem[]; startIndex: number; pageNumber: number; totalPages: number }) {
  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '1mm',
      fontSize: '11px'
    }}>
      <thead>
        <tr style={{
          borderTop: '1.5px solid #333',
          borderBottom: '1.5px solid #333'
        }}>
          <th style={{ padding: '1mm 2mm', textAlign: 'left', width: '6%', fontWeight: 'bold' }}>No.</th>
          <th style={{ padding: '1mm 2mm', textAlign: 'left', width: '38%', fontWeight: 'bold' }}>Items</th>
          <th style={{ padding: '1mm 2mm', textAlign: 'center', width: '10%', fontWeight: 'bold' }}>Qty</th>
          <th style={{ padding: '1mm 2mm', textAlign: 'right', width: '23%', fontWeight: 'bold' }}>Price</th>
          <th style={{ padding: '1mm 2mm', textAlign: 'right', width: '23%', fontWeight: 'bold' }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const globalIndex = startIndex + index;
          return (
            <tr
              key={item.id}
              style={{
                borderBottom: '1px solid #999',
              }}
            >
              <td style={{ padding: '1.2mm 2mm', fontWeight: 'bold' }}>{globalIndex + 1}.</td>
              <td style={{ padding: '1.2mm 2mm', fontWeight: 'bold' }}>{item.productNameSnapshot}</td>
              <td style={{ padding: '1.2mm 2mm', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
              <td style={{ padding: '1.2mm 2mm', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                {formatRs(item.appliedPrice)}
                {item.discountAmount > 0 && (
                  <span style={{ color: '#D32F2F', marginLeft: '1mm' }}>(-{formatRs(item.discountAmount)})</span>
                )}
              </td>
              <td style={{ padding: '1.2mm 2mm', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                {formatRs(item.itemTotal)}
              </td>
            </tr>
          );
        })}
      </tbody>
      {totalPages > 1 && (
        <tfoot>
          <tr>
            <td colSpan={5} style={{ textAlign: 'right', fontSize: '9px', color: '#888', padding: '1mm 2mm 0 0' }}>
              Page {pageNumber} / {totalPages}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function TotalsSection({ order, change, balanceDue }: { order: OfflineOrder; change: number; balanceDue: number }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: '3mm'
    }}>
      <table style={{
        borderCollapse: 'collapse',
        fontSize: '11px',
        minWidth: '45%'
      }}>
        <tbody>
          {/* Subtotal */}
          <tr style={{ borderTop: '1px solid #E0E0E0', fontWeight: 'bold', fontSize: '13px' }}>
            <td style={{ padding: '1mm 3mm', textAlign: 'right', color: '#333' }}>Subtotal:</td>
            <td style={{ padding: '1mm 0', textAlign: 'right', minWidth: '28mm' }}>{formatRs(order.subtotal)}</td>
          </tr>
          {order.totalDiscount > 0 && (
            <tr style={{ fontWeight: 'bold', fontSize: '13px' }}>
              <td style={{ padding: '0.8mm 3mm', textAlign: 'right', color: '#d61212ff' }}>Discount:</td>
              <td style={{ padding: '0.8mm 0', textAlign: 'right', color: '#d61212ff' }}>-{formatRs(order.totalDiscount)}</td>
            </tr>
          )}

          {/* Spacer + Net Total */}
          <tr style={{ height: '2mm' }}><td colSpan={2}></td></tr>
          <tr style={{ borderTop: '1.5px solid #333', fontWeight: 'bold', fontSize: '13px' }}>
            <td style={{ padding: '1.2mm 3mm', textAlign: 'right' }}>Net Total:</td>
            <td style={{ padding: '1.2mm 0', textAlign: 'right', color: '#2613ceff' }}>{formatRs(order.totalPrice)}</td>
          </tr>
          <tr style={{fontWeight: 'bold', fontSize: '13px'}}>
            <td style={{ padding: '0.8mm 3mm', textAlign: 'right', color: '#000' }}>Amount Paid:</td>
            <td style={{ padding: '0.8mm 0', textAlign: 'right', color: '#0d7e13ff' }}>{formatRs(order.paidAmount)}</td>
          </tr>
          {change > 0 && (
            <tr>
              <td style={{ padding: '0.8mm 3mm', textAlign: 'right', color: '#333' }}>Change:</td>
              <td style={{ padding: '0.8mm 0', textAlign: 'right', color: '#0d7e13ff' }}>{formatRs(change)}</td>
            </tr>
          )}
          {balanceDue > 0 && (
            <tr style={{ fontWeight: 'bold', fontSize: '13px' }}>
              <td style={{ padding: '0.8mm 3mm', textAlign: 'right', color: '#D32F2F' }}>Balance Due:</td>
              <td style={{ padding: '0.8mm 0', textAlign: 'right', color: '#D32F2F' }}>{formatRs(balanceDue)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PageFooter({ paymentMethod }: { paymentMethod: string }) {
  return (
    <div style={{
      textAlign: 'center',
      paddingTop: '2mm',
      marginTop: '2mm',
      borderTop: '1px solid #999'
    }}>
      <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#2613ceff' }}>
        Thank You for Your Purchase!
      </p>
      <p style={{ fontSize: '10px', margin: '1mm 0 0 0', color: '#333', fontWeight: "bold" }}>
        Paid with {paymentMethod}
      </p>
    </div>
  );
}



// ─── Main component ──────────────────────────────────────────────────────────

export const InvoiceReceipt = forwardRef<HTMLDivElement, InvoiceReceiptProps>(
  function InvoiceReceipt({ order }, ref) {
    if (!order) return null;

    const change = order.paidAmount > order.totalPrice
      ? order.paidAmount - order.totalPrice
      : 0;
    const balanceDue = order.outstandingAmount > 0 ? order.outstandingAmount : 0;

    const pages = chunkArray(order.items, ITEMS_PER_PAGE);
    const totalPages = pages.length;

    // Shared page styles
    const pageStyle: React.CSSProperties = {
      fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
      fontSize: '12px',
      lineHeight: '1.4',
      color: '#000',
      backgroundColor: '#fff',
      width: '148mm',
      padding: '4mm 6mm',
      boxSizing: 'border-box',
    };

    return (
      <div ref={ref} className="print-content bg-white text-black">
        {pages.map((pageItems, pageIndex) => {
          const isLastPage = pageIndex === totalPages - 1;
          const startIndex = pageIndex * ITEMS_PER_PAGE;

          return (
            <div
              key={pageIndex}
              style={{
                ...pageStyle,
                // Force page break after every page except the last
                ...(isLastPage ? {} : { pageBreakAfter: 'always' as const }),
              }}
            >
              {/* Header repeats on every page */}
              <PageHeader />
              <BillToSection order={order} balanceDue={balanceDue} />

              {/* Items table for this page — page indicator embedded in tfoot */}
              <ItemsTable items={pageItems} startIndex={startIndex} pageNumber={pageIndex + 1} totalPages={totalPages} />

              {/* Totals + footer only on the last page */}
              {isLastPage && (
                <>
                  <TotalsSection order={order} change={change} balanceDue={balanceDue} />
                  <PageFooter paymentMethod={order.paymentMethod || 'Cash'} />
                </>
              )}
            </div>
          );
        })}

        {/* Print-specific styles */}
        <style jsx global>{`
          @media print {
            .print-content {
              width: 148mm !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
            }
          }
        `}</style>
      </div>
    );
  }
);
