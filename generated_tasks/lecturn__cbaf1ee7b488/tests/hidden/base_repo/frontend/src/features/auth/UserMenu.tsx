"use client";

import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown";
import { signOut, useSession } from "~/lib/auth-client";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu() {
  const { data, isPending } = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) return null;
  if (!data?.user) {
    return (
      <Button asChild size="sm" variant="ghost">
        <Link href="/sign-in">Sign in</Link>
      </Button>
    );
  }

  const user = data.user;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full bg-[var(--muted)] text-sm font-medium hover:bg-[var(--border)] transition-colors"
          aria-label="Account"
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name} className="size-9 rounded-full object-cover" />
          ) : (
            initials(user.name) || <User className="size-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>
          <div className="font-medium text-[var(--foreground)] truncate">{user.name}</div>
          <div className="truncate">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/account">
            <User className="size-4" /> Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="size-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={signingOut} onSelect={handleSignOut}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
