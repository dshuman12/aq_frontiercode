"use client";

import { cn } from "~/lib/utils";

export interface ModeOption<T extends string> {
  value: T;
  label: string;
}

interface ModeToggleProps<T extends string> {
  options: ModeOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

export function ModeToggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: ModeToggleProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-lg bg-(--muted) p-1 text-sm"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md py-1.5 text-center font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
              active
                ? "bg-(--background) text-(--foreground) shadow-sm"
                : "text-(--muted-foreground) hover:text-(--foreground)",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
