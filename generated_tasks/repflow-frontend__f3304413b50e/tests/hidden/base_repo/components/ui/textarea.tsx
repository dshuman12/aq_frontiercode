import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Base styles - consistent with Input component
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2",
        // Typography - consistent text styling
        "text-sm text-foreground placeholder:text-muted-foreground",
        // Focus states - consistent focus ring
        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Disabled states - consistent disabled appearance
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
        // Transitions for smooth state changes
        "transition-colors duration-200",
        // Hover state for better interactivity
        "hover:border-input/80",
        // Resize handle
        "resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
