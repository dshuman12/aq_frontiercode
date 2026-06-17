import { Quote } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LecturnMark } from "~/components/lecturn-mark";

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-(--background) lg:grid lg:grid-cols-2">
      <main className="relative flex min-h-screen flex-col px-6 py-8 lg:px-12 lg:py-12">
        <header className="lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2">
            <LecturnMark className="size-6" />
            <span className="font-display text-lg font-semibold tracking-tight">Lecturn</span>
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-105">{children}</div>
        </div>
      </main>

      <aside className="relative hidden overflow-hidden bg-ink-950 text-parchment-100 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 80% 0%, var(--color-amber-accent) 0%, transparent 70%), radial-gradient(50% 50% at 0% 100%, color-mix(in oklch, var(--color-amber-accent) 35%, transparent) 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-parchment-100) 1px, transparent 1px), linear-gradient(90deg, var(--color-parchment-100) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <Link
          href="/"
          className="relative z-10 inline-flex items-center gap-2 text-parchment-100"
        >
          <LecturnMark className="size-7" />
          <span className="font-display text-xl font-semibold tracking-tight">Lecturn</span>
        </Link>

        <div className="relative z-10 max-w-md space-y-6">
          <Quote className="size-8 text-amber-accent/80" aria-hidden />
          <p className="font-display text-3xl font-medium leading-snug tracking-tight text-balance">
            Your shelf, on your hardware. A focused player for the courses you bought,
            ripped, or recorded — no streaming bills, no DRM, no nonsense.
          </p>
          <div className="text-sm text-parchment-100/70">
            Self-hosted · Free
          </div>
        </div>

        <div className="relative z-10 text-xs text-parchment-100/50">
          © {new Date().getFullYear()} Lecturn
        </div>
      </aside>
    </div>
  );
}
