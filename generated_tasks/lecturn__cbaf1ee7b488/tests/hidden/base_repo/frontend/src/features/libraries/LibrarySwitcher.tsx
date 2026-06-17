"use client";

import { Check, ChevronDown, FolderTree, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown";
import { useActiveLibrary } from "~/stores/active-library";
import { useLibraries } from "./hooks";

export function LibrarySwitcher() {
  const { data: libraries, isLoading } = useLibraries();
  const activeId = useActiveLibrary((s) => s.activeLibraryId);
  const setActive = useActiveLibrary((s) => s.setActiveLibrary);

  // Reset to a valid library if the persisted activeId is missing or no longer accessible.
  useEffect(() => {
    if (!libraries) return;
    const found = libraries.find((l) => l.id === activeId);
    if (!found) {
      setActive(libraries[0]?.id ?? null);
    }
  }, [libraries, activeId, setActive]);

  if (isLoading || !libraries) return null;

  const active = libraries.find((l) => l.id === activeId) ?? libraries[0];
  const label = active?.name ?? "No library";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FolderTree className="size-4" />
          <span className="max-w-[14ch] truncate">{label}</span>
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[16rem]">
        <DropdownMenuLabel>Libraries</DropdownMenuLabel>
        {libraries.map((lib) => (
          <DropdownMenuItem
            key={lib.id}
            onSelect={() => setActive(lib.id)}
            className="justify-between"
          >
            <div className="min-w-0">
              <div className="truncate">{lib.name}</div>
              <div className="text-xs text-[var(--muted-foreground)] truncate">
                {lib.role === "owner" ? "Owned" : `Shared by ${lib.ownerName}`}
              </div>
            </div>
            {lib.id === active?.id && <Check className="size-4 shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/libraries">
            <Plus className="size-4" /> Manage libraries
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
