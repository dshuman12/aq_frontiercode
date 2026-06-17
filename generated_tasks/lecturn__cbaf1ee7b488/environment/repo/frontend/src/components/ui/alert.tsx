import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import * as React from "react";
import { cn } from "~/lib/utils";

type Variant = "error" | "success" | "info";

const ICONS: Record<Variant, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const STYLES: Record<Variant, string> = {
  error:
    "border-red-200/70 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200",
  success:
    "border-emerald-200/70 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200",
  info: "border-[var(--border)] bg-[var(--muted)]/50 text-[var(--foreground)]",
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  title?: string;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", title, children, ...props }, ref) => {
    const Icon = ICONS[variant];
    return (
      <div
        ref={ref}
        role={variant === "error" ? "alert" : "status"}
        className={cn(
          "flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm",
          STYLES[variant],
          className,
        )}
        {...props}
      >
        <Icon className="size-4 shrink-0 translate-y-0.5" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          {title && <div className="font-medium leading-tight">{title}</div>}
          {children && <div className="leading-snug opacity-90">{children}</div>}
        </div>
      </div>
    );
  },
);
Alert.displayName = "Alert";
