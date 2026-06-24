import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles - consistent across all inputs
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
          // Typography - consistent text styling
          "text-sm text-foreground placeholder:text-muted-foreground",
          // Focus states - consistent focus ring
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // Disabled states - consistent disabled appearance
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
          // File input specific
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Transitions for smooth state changes
          "transition-colors duration-200",
          // Hover state for better interactivity
          "hover:border-input/80",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
