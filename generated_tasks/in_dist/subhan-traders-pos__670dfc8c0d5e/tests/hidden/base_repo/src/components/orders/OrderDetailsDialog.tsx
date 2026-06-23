"use client";

import { InvoiceReceipt } from "@/components/pos/InvoiceReceipt";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { OfflineOrder, OfflineOrderItem } from "@/offline/db";
import { Banknote, Printer } from "lucide-react";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { OrderPaymentDialog } from "./OrderPaymentDialog";

interface OrderItem {
    id: string;
    productName: string; // snapshot name
    quantity: number;
    price: number; // appliedPrice
    discount: number; // discountAmount
    total: number; // itemTotal
}

interface OrderDetails {
    id: string;
    invoiceId: string;
    createdAt: string;
    customerName: string | null;
    customerPhone: string | null;
    walkInCustomerName: string | null;
    items: any[]; // Raw items from backend
    subtotal: number;
    totalDiscount: number;
    totalPrice: number;
    paidAmount: number;
    outstandingAmount: number;
    paymentMethod: 'CASH' | 'CARD' | 'ONLINE_PAYMENT' | null;
    isWholesale: boolean;
    orderStatus: string;
}

interface OrderDetailsDialogProps {
    order: OrderDetails;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onPaymentSuccess?: () => void;
}

export function OrderDetailsDialog({ order, trigger, open, onOpenChange, onPaymentSuccess }: OrderDetailsDialogProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const [paymentKey, setPaymentKey] = useState(0);
    
    // Process items for display (handling backend structure)
    const displayItems: OrderItem[] = order.items.map((item: any) => ({
        id: item.id,
        productName: item.productNameSnapshot || "Unknown Product",
        quantity: item.quantity,
        price: parseFloat(item.appliedPrice),
        discount: parseFloat(item.discountAmount || 0),
        total: parseFloat(item.itemTotal)
    }));

    // Build an OfflineOrder-compatible object for InvoiceReceipt
    const printOrder: OfflineOrder = {
        id: order.id,
        invoiceId: order.invoiceId,
        customerId: null,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        walkInCustomerName: order.walkInCustomerName,
        subtotal: order.subtotal,
        totalDiscount: order.totalDiscount,
        totalPrice: order.totalPrice,
        paidAmount: order.paidAmount,
        outstandingAmount: order.outstandingAmount,
        paymentMethod: order.paymentMethod,
        orderStatus: order.orderStatus as OfflineOrder['orderStatus'],
        isWholesale: order.isWholesale,
        createdAt: order.createdAt,
        synced: true,
        items: order.items.map((item: any): OfflineOrderItem => ({
            id: item.id,
            orderId: order.id,
            itemId: item.itemId || null,
            productNameSnapshot: item.productNameSnapshot || "Unknown Product",
            quantity: item.quantity,
            priceType: item.priceType || 'RETAIL',
            appliedPrice: parseFloat(item.appliedPrice),
            discountAmount: parseFloat(item.discountAmount || 0),
            itemTotal: parseFloat(item.itemTotal),
        })),
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Invoice-${order.invoiceId}`,
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {open === undefined && (
                <DialogTrigger asChild>
                    {trigger || <Button variant="ghost" size="sm">View</Button>}
                </DialogTrigger>
            )}
            <DialogContent className="max-w-3xl sm:max-w-4xl">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <DialogTitle className="text-2xl">Order Details</DialogTitle>
                        <Button onClick={() => handlePrint()} variant="outline" size="sm" className="hidden sm:flex">
                            <Printer className="mr-2 h-4 w-4" /> Print Invoice
                        </Button>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Invoice #</p>
                            <p className="font-bold text-lg">{order.invoiceId}</p>
                        </div>
                         <div className="text-right">
                            <p className="text-muted-foreground">Date</p>
                            <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Customer</p>
                            <p className="font-medium">{order.customerName || "Walk-in Customer"}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-muted-foreground">Status</p>
                            <p className="font-medium">{order.orderStatus}</p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="border rounded-md max-h-[40vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Discount</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.productName}</TableCell>
                                        <TableCell className="text-right">Rs. {item.price.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right text-destructive">
                                            {item.discount > 0 ? `- Rs. ${item.discount.toLocaleString()}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">Rs. {item.total.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Footer Totals */}
                    <div className="flex justify-end">
                        <div className="w-1/2 sm:w-1/3 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>Rs. {order.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Discount</span>
                                <span>Rs. {order.totalDiscount.toLocaleString()}</span>
                            </div>
                            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>Rs. {order.totalPrice.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Action for outstanding orders */}
                    {order.outstandingAmount > 0 && order.orderStatus !== 'CANCELLED' && (
                        <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/40 px-4 py-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                    Rs. {order.outstandingAmount.toLocaleString()}
                                </p>
                            </div>
                            <OrderPaymentDialog
                                key={paymentKey}
                                orderId={order.id}
                                invoiceId={order.invoiceId}
                                outstandingAmount={order.outstandingAmount}
                                customerName={order.customerName}
                                onPaymentSuccess={() => {
                                    setPaymentKey(prev => prev + 1);
                                    onPaymentSuccess?.();
                                }}
                                trigger={
                                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                                        <Banknote className="mr-2 h-4 w-4" />
                                        Record Payment
                                    </Button>
                                }
                            />
                        </div>
                    )}
                </div>

                {/* Hidden Print Template — uses the exact same InvoiceReceipt as POS */}
                <div style={{ 
                    position: 'fixed', 
                    left: '-9999px', 
                    top: 0,
                    width: '148mm',
                    minHeight: '210mm',
                    background: '#fff'
                }}>
                    <InvoiceReceipt ref={printRef} order={printOrder} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
