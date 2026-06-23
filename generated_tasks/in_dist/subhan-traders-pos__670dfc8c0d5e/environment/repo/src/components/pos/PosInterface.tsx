"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createOrder } from "@/lib/actions/order.actions"; // We will create this next
import { useCartStore } from "@/store/cart-store";
import { CreditCard, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface Product {
    id: string;
    productName: string;
    retailPrice: string;
    quantity: number;
    barcode: string | null;
}

interface Customer {
    id: string;
    name: string;
}

interface PosInterfaceProps {
    products: Product[];
    customers: Customer[];
}

export function PosInterface({ products, customers }: PosInterfaceProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const { items, addItem, removeItem, updateQuantity, subtotal, total, discount, setDiscount, customerId, setCustomer, clearCart } = useCartStore();
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    // Filter products
    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products;
        const lower = searchQuery.toLowerCase();
        return products.filter(p => 
            p.productName.toLowerCase().includes(lower) || 
            (p.barcode && p.barcode.includes(lower))
        );
    }, [products, searchQuery]);

    // Handle Add to Cart
    const handleAddToCart = (product: Product) => {
        addItem({
            productId: product.id,
            name: product.productName,
            price: Number(product.retailPrice),
            quantity: 1,
            maxStock: product.quantity
        });
        toast.success(`Added ${product.productName}`);
    };

    // Handle Checkout
    const handleCheckout = async () => {
        if (items.length === 0) {
            toast.error("Cart is empty");
            return;
        }
        
        setIsCheckingOut(true);
        try {
            const orderData = {
                customerId: customerId,
                items: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
                discount: discount,
                totalAmount: total(),
            };

            const result = await createOrder(orderData);
            if (result.success) {
                toast.success("Order processed successfully!");
                clearCart();
            } else {
                toast.error("Checkout failed: " + result.error);
            }
        } catch (e) {
            toast.error("An error occurred during checkout");
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full">
            {/* Left Side: Product Selection */}
            <div className="md:col-span-8 flex flex-col h-full gap-4">
                <Card className="flex-none p-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search products by name or scan barcode..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </Card>
                
                <ScrollArea className="flex-1 bg-muted/20 rounded-md border p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <Card 
                                key={product.id} 
                                className="cursor-pointer hover:bg-muted/50 transition-colors flex flex-col justify-between"
                                onClick={() => handleAddToCart(product)}
                            >
                                <CardHeader className="p-4">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-sm font-medium leading-tight">{product.productName}</CardTitle>
                                        <Badge variant={product.quantity > 0 ? "secondary" : "destructive"}>
                                            {product.quantity}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardFooter className="p-4 pt-0">
                                    <p className="font-bold text-lg">Rs. {product.retailPrice}</p>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Right Side: Cart & Checkout */}
            <div className="md:col-span-4 flex flex-col h-full">
                <Card className="flex flex-col h-full border-l-4 border-l-primary">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Current Sale
                        </CardTitle>
                        
                         <Select onValueChange={setCustomer} value={customerId || undefined}>
                            <SelectTrigger className="w-full mt-2">
                                <SelectValue placeholder="Select Customer (Optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                                {customers.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    
                    <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea className="h-full p-4">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                    <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
                                    <p>Cart is empty</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {items.map(item => (
                                        <div key={item.productId} className="flex justify-between items-center bg-muted/40 p-2 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Button 
                                                        variant="outline" size="icon" className="h-6 w-6" 
                                                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                    >
                                                        -
                                                    </Button>
                                                    <span className="text-sm w-4 text-center">{item.quantity}</span>
                                                     <Button 
                                                        variant="outline" size="icon" className="h-6 w-6"
                                                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="text-right ml-2">
                                                <p className="font-bold text-sm">Rs. {item.price * item.quantity}</p>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2"
                                                    onClick={() => removeItem(item.productId)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>

                    <Separator />
                    
                    <CardFooter className="flex-col bg-muted/10 p-4 gap-4">
                        <div className="w-full space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>Rs. {subtotal()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Discount</span>
                                <Input 
                                    type="number" 
                                    className="h-8 w-20 text-right" 
                                    value={discount} 
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                />
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>Rs. {total()}</span>
                            </div>
                        </div>

                        <Button 
                            className="w-full h-12 text-lg" 
                            size="lg"
                            onClick={handleCheckout}
                            disabled={isCheckingOut || items.length === 0}
                        >
                            {isCheckingOut ? (
                                "Processing..."
                            ) : (
                                <>
                                    <CreditCard className="mr-2 h-5 w-5" /> Pay Now
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
