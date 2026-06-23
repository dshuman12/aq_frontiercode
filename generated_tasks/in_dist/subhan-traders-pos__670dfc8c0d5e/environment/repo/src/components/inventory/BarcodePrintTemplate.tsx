"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { BarcodeFormat, BarcodeGenerator } from "./BarcodeGenerator";

export type LabelSize = "small" | "medium" | "large";

interface BarcodePrintTemplateProps {
  productName: string;
  barcode: string;
  price?: number;
  format?: BarcodeFormat;
  size?: LabelSize;
  showPrice?: boolean;
  showProductName?: boolean;
  copies?: number;
  className?: string;
}

const sizeConfig: Record<LabelSize, { width: number; height: number; fontSize: number; barcodeHeight: number; barcodeWidth: number }> = {
  small: { width: 200, height: 100, fontSize: 10, barcodeHeight: 40, barcodeWidth: 1.2 },
  medium: { width: 280, height: 140, fontSize: 12, barcodeHeight: 60, barcodeWidth: 1.5 },
  large: { width: 380, height: 180, fontSize: 14, barcodeHeight: 80, barcodeWidth: 2 },
};

export const BarcodePrintTemplate = forwardRef<HTMLDivElement, BarcodePrintTemplateProps>(
  function BarcodePrintTemplate(
    {
      productName,
      barcode,
      price,
      format = "CODE128",
      size = "medium",
      showPrice = true,
      showProductName = true,
      copies = 1,
      className,
    },
    ref
  ) {
    const config = sizeConfig[size];

    const renderLabel = (index: number) => (
      <div
        key={index}
        className={cn(
          "bg-white text-black flex flex-col items-center justify-center p-2 border border-gray-200",
          className
        )}
        style={{
          width: config.width,
          minHeight: config.height,
          pageBreakInside: "avoid",
        }}
      >
        {showProductName && (
          <p
            className="font-semibold text-center truncate w-full px-1"
            style={{ fontSize: config.fontSize }}
          >
            {productName}
          </p>
        )}
        
        <div className="my-1">
          <BarcodeGenerator
            value={barcode}
            format={format}
            height={config.barcodeHeight}
            width={config.barcodeWidth}
            displayValue={true}
            fontSize={config.fontSize - 2}
            margin={2}
            background="#ffffff"
            lineColor="#000000"
          />
        </div>

        {showPrice && price !== undefined && (
          <p
            className="font-bold"
            style={{ fontSize: config.fontSize + 2 }}
          >
            Rs. {price.toLocaleString()}
          </p>
        )}
      </div>
    );

    return (
      <div ref={ref} className="print:bg-white">
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from({ length: copies }, (_, i) => renderLabel(i))}
        </div>
        
        {/* Print-specific styles */}
        <style jsx global>{`
          @media print {
            @page {
              margin: 5mm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:bg-white {
              background-color: white !important;
            }
          }
        `}</style>
      </div>
    );
  }
);

// Batch print template for multiple products
interface BatchBarcodePrintProps {
  products: Array<{
    id: string;
    productName: string;
    barcode: string;
    price?: number;
    copies?: number;
  }>;
  format?: BarcodeFormat;
  size?: LabelSize;
  showPrice?: boolean;
  showProductName?: boolean;
}

export const BatchBarcodePrint = forwardRef<HTMLDivElement, BatchBarcodePrintProps>(
  function BatchBarcodePrint(
    {
      products,
      format = "CODE128",
      size = "medium",
      showPrice = true,
      showProductName = true,
    },
    ref
  ) {
    return (
      <div ref={ref} className="print:bg-white p-4">
        <div className="flex flex-wrap gap-2 justify-start">
          {products.flatMap((product) =>
            Array.from({ length: product.copies || 1 }, (_, index) => (
              <BarcodePrintTemplate
                key={`${product.id}-${index}`}
                productName={product.productName}
                barcode={product.barcode}
                price={product.price}
                format={format}
                size={size}
                showPrice={showPrice}
                showProductName={showProductName}
                copies={1}
              />
            ))
          )}
        </div>
        
        <style jsx global>{`
          @media print {
            @page {
              margin: 5mm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
      </div>
    );
  }
);
