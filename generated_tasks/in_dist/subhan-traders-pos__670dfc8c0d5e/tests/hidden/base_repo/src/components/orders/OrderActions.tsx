"use client";

import { Invoice } from "@/components/pos/Invoice";
import { Button } from "@/components/ui/button";
import { Eye, Printer } from "lucide-react";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { OrderDetailsDialog } from "./OrderDetailsDialog";

export function OrderActions({ order }: { order: any }) {
    const [showDetails, setShowDetails] = useState(false);
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Invoice-${order.id.slice(-6)}`,
    });

    return (
        <>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => setShowDetails(true)}>
                    <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handlePrint()}>
                    <Printer className="h-4 w-4" />
                </Button>
            </div>

            <OrderDetailsDialog 
                order={order} 
                open={showDetails} 
                onOpenChange={setShowDetails} 
            />
            
            <div className="hidden">
                 <Invoice ref={componentRef} order={order} />
            </div>
        </>
    );
}
