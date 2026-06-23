"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import Barcode from "react-barcode";

export type BarcodeFormat = 
  | "CODE128" 
  | "CODE128A" 
  | "CODE128B" 
  | "CODE128C"
  | "EAN13" 
  | "EAN8" 
  | "UPC" 
  | "CODE39"
  | "ITF14"
  | "MSI"
  | "pharmacode";

export interface BarcodeGeneratorProps {
  value: string;
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textMargin?: number;
  margin?: number;
  background?: string;
  lineColor?: string;
  className?: string;
  onError?: (error: string) => void;
}

export function BarcodeGenerator({
  value,
  format = "CODE128",
  width = 2,
  height = 100,
  displayValue = true,
  fontSize = 16,
  textMargin = 2,
  margin = 10,
  background = "#ffffff",
  lineColor = "#000000",
  className,
  onError,
}: BarcodeGeneratorProps) {
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validate barcode value based on format
  useEffect(() => {
    if (!value || value.trim() === "") {
      setIsValid(false);
      setErrorMessage("Barcode value is required");
      return;
    }

    let valid = true;
    let error = "";

    switch (format) {
      case "EAN13":
        if (!/^\d{12,13}$/.test(value)) {
          valid = false;
          error = "EAN-13 requires exactly 12-13 digits";
        }
        break;
      case "EAN8":
        if (!/^\d{7,8}$/.test(value)) {
          valid = false;
          error = "EAN-8 requires exactly 7-8 digits";
        }
        break;
      case "UPC":
        if (!/^\d{11,12}$/.test(value)) {
          valid = false;
          error = "UPC requires exactly 11-12 digits";
        }
        break;
      case "CODE39":
        if (!/^[A-Z0-9\-. $/+%]+$/i.test(value)) {
          valid = false;
          error = "CODE39 only supports A-Z, 0-9, and -. $/+%";
        }
        break;
      case "ITF14":
        if (!/^\d{13,14}$/.test(value)) {
          valid = false;
          error = "ITF14 requires exactly 13-14 digits";
        }
        break;
      default:
        // CODE128 supports all ASCII characters
        valid = true;
    }

    setIsValid(valid);
    setErrorMessage(valid ? null : error);
    
    if (!valid && onError) {
      onError(error);
    }
  }, [value, format, onError]);

  if (!isValid) {
    return (
      <div className={cn(
        "flex items-center justify-center p-4 border border-dashed border-destructive/50 rounded-md bg-destructive/5",
        className
      )}>
        <p className="text-sm text-destructive">{errorMessage || "Invalid barcode"}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Barcode
        value={value}
        format={format}
        width={width}
        height={height}
        displayValue={displayValue}
        fontSize={fontSize}
        textMargin={textMargin}
        margin={margin}
        background={background}
        lineColor={lineColor}
      />
    </div>
  );
}

// Utility function to generate unique barcode
export function generateUniqueBarcode(prefix: string = "ST"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Utility function to generate EAN-13 check digit
export function calculateEAN13CheckDigit(code: string): string {
  if (code.length !== 12) {
    throw new Error("EAN-13 code must be exactly 12 digits");
  }
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit;
}

// Generate a random EAN-13 barcode
export function generateEAN13Barcode(): string {
  // Use a fixed prefix for the store (e.g., 200 for internal use)
  const prefix = "200";
  const randomPart = Math.floor(Math.random() * 1000000000).toString().padStart(9, "0");
  const code = prefix + randomPart;
  return calculateEAN13CheckDigit(code.substring(0, 12));
}
