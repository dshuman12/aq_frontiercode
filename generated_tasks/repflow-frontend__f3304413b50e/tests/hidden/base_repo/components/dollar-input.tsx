
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DollarInputProps = {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  containerClassName?: string;
  className?: string;
  disabled?: boolean;
} & Omit<React.ComponentProps<"input">, "type" | "value" | "onChange">;

export function DollarInput({
  value = 0,
  onChange,
  placeholder = "0.00",
  containerClassName,
  className,
  disabled,
  ...props
}: DollarInputProps) {

  // Format number to display with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Parse display value back to number
  const parseDisplayValue = (str: string): number => {
    const cleaned = str.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Remove dollar sign and any formatting to get raw input
    const rawValue = inputValue.replace(/^\$/, "").replace(/,/g, "");
    
    // Allow only numbers and decimal point
    if (!/^[0-9]*\.?[0-9]*$/.test(rawValue)) {
      return;
    }

    // Update display value with formatting
    const numericValue = parseDisplayValue(rawValue);
    
    // Call onChange with numeric value
    if (onChange) {
      onChange(numericValue);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Remove formatting for easier editing
    e.target.select();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Restore formatting
    const numericValue = parseDisplayValue(e.target.value);
    
    if (onChange) {
      onChange(numericValue);
    }
  };

  return (
    <div className={cn("relative", containerClassName)}>
      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        $
      </span>
      <input
        {...props}
        type="text"
        value={formatNumber(value)}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
      />
    </div>
  );
}