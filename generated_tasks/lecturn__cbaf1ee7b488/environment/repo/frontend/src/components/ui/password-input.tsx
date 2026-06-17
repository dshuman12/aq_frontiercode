"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { cn } from "~/lib/utils";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 pr-10 text-sm transition-colors",
            "placeholder:text-(--muted-foreground)",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-(--muted-foreground) hover:text-(--foreground) transition-colors"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
