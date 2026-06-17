"use client";

import { cn } from "~/lib/utils";

interface Score {
  value: 0 | 1 | 2 | 3 | 4;
  label: string;
}

// UI affordance only — server enforces the actual policy.
export function scorePassword(pw: string): Score {
  if (!pw) return { value: 0, label: "" };
  let v = 0;
  if (pw.length >= 8) v++;
  if (pw.length >= 12) v++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) v++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) v++;
  const labels = ["Too short", "Weak", "Okay", "Strong", "Excellent"];
  const clamped = Math.min(4, v) as Score["value"];
  return { value: clamped, label: labels[clamped] ?? "" };
}

const COLORS = [
  "bg-(--border)",
  "bg-red-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-emerald-600",
];

export function PasswordStrength({ password }: { password: string }) {
  const { value, label } = scorePassword(password);
  if (!password) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < value ? COLORS[value] : "bg-(--border)",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-(--muted-foreground)">
        Strength: <span className="font-medium text-(--foreground)">{label}</span>
      </p>
    </div>
  );
}
