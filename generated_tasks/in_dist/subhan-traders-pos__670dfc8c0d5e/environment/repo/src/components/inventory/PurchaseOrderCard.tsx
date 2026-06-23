import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Banknote, Pencil, Printer, ShoppingBag, Trash2, Wallet } from "lucide-react";

export interface PurchaseOrderItem {
    id: string;
    productNameSnapshot: string;
    quantity: number;
    purchasePrice: string;
    itemTotal: string;
}

export interface PurchaseOrderPayment {
    id: string;
    amount: string;
    paymentMethod: string;
    notes: string | null;
    paymentDate: string;
}

export interface PurchaseOrder {
    id: string;
    purchaseDate: string;
    totalAmount: string;
    paidAmount: string;
    remainingAmount: string;
    notes: string | null;
    items: PurchaseOrderItem[];
    payments: PurchaseOrderPayment[];
}

export interface POCardSupplier {
    id?: string;
    name: string;
    phone: string;
    address: string | null;
}

export function getPOStatus(po: PurchaseOrder): 'FULLY_PAID' | 'PARTIALLY_PAID' | 'PENDING' {
    const remaining = parseFloat(po.remainingAmount);
    const paid = parseFloat(po.paidAmount);
    if (remaining <= 0) return 'FULLY_PAID';
    if (paid > 0) return 'PARTIALLY_PAID';
    return 'PENDING';
}

export const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    PARTIALLY_PAID: { label: 'Partial', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    FULLY_PAID: { label: 'Paid', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
};

export function PurchaseOrderCard({
    po,
    supplier,
    onPayment,
    onEdit,
    onDelete,
    onPrintPayment
}: {
    po: PurchaseOrder;
    supplier: POCardSupplier;
    onPayment: (po: PurchaseOrder) => void;
    onEdit: (po: PurchaseOrder) => void;
    onDelete: (po: PurchaseOrder) => void;
    onPrintPayment: (payment: PurchaseOrderPayment, po: PurchaseOrder) => void;
}) {
    const poTotal = parseFloat(po.totalAmount);
    const poPaid = parseFloat(po.paidAmount);
    const poBalance = parseFloat(po.remainingAmount);
    const status = getPOStatus(po);
    const config = statusConfig[status];

    return (
        <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/30 border-b">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                        {format(new Date(po.purchaseDate), "MMM d, yyyy")}
                        {supplier && supplier.name && (
                           <span className="text-sm font-normal text-muted-foreground ml-2">({supplier.name})</span>
                        )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        {po.items.length} {po.items.length === 1 ? 'item' : 'items'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className={config.className}>
                        {config.label}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => onEdit(po)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-white" onClick={() => onDelete(po)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                {/* Financial Overview */}
                <div className="grid grid-cols-3 gap-4 text-sm bg-muted/10 p-4 rounded-lg border">
                    <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-semibold text-lg">Rs. {poTotal.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Paid Amount</p>
                        <p className="font-semibold text-lg text-green-600">Rs. {poPaid.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Balance Due</p>
                        <p className={`font-semibold text-lg ${poBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                            Rs. {poBalance.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Optional Notes */}
                {po.notes && (
                    <div className="bg-yellow-50/50 dark:bg-yellow-950/20 p-3 rounded-md border border-yellow-100 dark:border-yellow-900">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Notes:</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{po.notes}</p>
                    </div>
                )}

                {/* Items Table */}
                <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 object-contain text-muted-foreground" />
                        Purchase Items
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {po.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.productNameSnapshot}</TableCell>
                                        <TableCell className="text-right">Rs. {parseFloat(item.purchasePrice).toLocaleString()}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right">Rs. {parseFloat(item.itemTotal).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Payment History & Actions */}
                <div className="flex flex-col sm:flex-row gap-6">
                    {po.payments && po.payments.length > 0 && (
                        <div className="flex-1">
                            <h4 className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                Payment History
                            </h4>
                            <div className="space-y-2">
                                {po.payments.map(payment => (
                                    <div key={payment.id} className="flex justify-between items-center text-sm border-b pb-2">
                                        <div>
                                            <p className="font-medium">{format(new Date(payment.paymentDate), "MMM d, yyyy")}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                                    {payment.paymentMethod.replace('_', ' ')}
                                                </Badge>
                                                {payment.notes && <span className="text-xs text-muted-foreground">• {payment.notes}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <p className="text-green-600 font-semibold">+ Rs. {parseFloat(payment.amount).toLocaleString()}</p>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6"
                                                onClick={() => onPrintPayment(payment, po)}
                                                title="Print receipt"
                                            >
                                                <Printer className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 flex flex-col justify-end items-end gap-3 mt-4 sm:mt-0">
                        {poBalance > 0 && (
                            <Button
                                className="w-full sm:w-auto"
                                onClick={() => onPayment(po)}
                            >
                                <Banknote className="mr-2 h-4 w-4" />
                                Record Payment
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
