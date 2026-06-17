"use client";

import { FolderTree, KeyRound, Network, Settings as SettingsIcon, User } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

const TABS: { href: Route; label: string; icon: typeof SettingsIcon }[] = [
  { href: "/settings", label: "Overview", icon: SettingsIcon },
  { href: "/settings/account", label: "Account", icon: User },
  { href: "/settings/sessions", label: "Sessions", icon: KeyRound },
  { href: "/settings/libraries", label: "Libraries", icon: FolderTree },
  { href: "/settings/connection", label: "Connection", icon: Network },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
      <nav className="space-y-1">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--muted)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="size-4" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0 max-w-3xl">{children}</div>
    </div>
  );
}
