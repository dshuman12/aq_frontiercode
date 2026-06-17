import * as React from "react";
import { cn } from "~/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-[var(--card)] text-[var(--card-foreground)] rounded-[var(--radius-card)] border border-[var(--border)] overflow-hidden transition-shadow hover:shadow-md",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5", className)} {...props} />
  ),
);
CardBody.displayName = "CardBody";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardMeta = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--muted-foreground)]", className)} {...props} />
  ),
);
CardMeta.displayName = "CardMeta";
