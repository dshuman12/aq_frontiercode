"use client";

import { format } from "date-fns";
import { forwardRef } from "react";

interface InvoiceProps {
  order: any;
  settings?: any; // For shop name, address etc. (Hardcoded for now)
}

export const Invoice = forwardRef<HTMLDivElement, InvoiceProps>(({ order, settings }, ref) => {
  if (!order) return null;

  return (
    <div ref={ref} className="bg-white p-8 w-[80mm] min-h-[100mm] text-xs font-mono">
        <div className="text-center mb-4">
            <h1 className="text-xl font-bold">Subhan Traders</h1>
            <p>123 Cycle Market, Lahore</p>
            <p>Phone: 0300-1234567</p>
        </div>

        <div className="border-b border-dashed border-black mb-2 pb-2">
            <div className="flex justify-between">
                <span>Inv #:</span>
                <span>{order.id.slice(-6)}</span>
            </div>
            <div className="flex justify-between">
                <span>Date:</span>
                <span>{format(new Date(order.createdAt), "dd/MM/yy HH:mm")}</span>
            </div>
            <div className="flex justify-between">
                <span>Cust:</span>
                <span>{order.customer?.name || "Walk-in"}</span>
            </div>
        </div>

        <table className="w-full text-left mb-4">
            <thead>
                <tr className="border-b border-black">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-right">Qty</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                {order.orderItems.map((item: any) => (
                    <tr key={item.id}>
                        <td className="py-1 pr-2 truncate max-w-[30mm]">{item.item?.productName}</td>
                        <td className="py-1 text-right">{item.quantity}</td>
                        <td className="py-1 text-right">{item.price}</td>
                        <td className="py-1 text-right">{(Number(item.price) * item.quantity).toFixed(0)}</td>
                    </tr>
                ))}
            </tbody>
        </table>

        <div className="border-t border-dashed border-black pt-2 space-y-1">
            <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>Rs. {order.totalAmount}</span>
            </div>
            {Number(order.discount) > 0 && (
                 <div className="flex justify-between text-xs">
                    <span>Discount:</span>
                    <span>- {order.discount}</span>
                </div>
            )}
             <div className="flex justify-between font-bold text-lg mt-2 border-t border-black pt-1">
                <span>Net Total:</span>
                <span>Rs. {(Number(order.totalAmount) - Number(order.discount)).toFixed(0)}</span>
            </div>
        </div>

        <div className="text-center mt-6 text-[10px]">
            <p>Thank you for shopping with us!</p>
            <p>No Return, No Exchange logic here text...</p>
            <p>Software by @Antigravity</p>
        </div>
    </div>
  );
});

Invoice.displayName = "Invoice";
