"use client";

import { Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { SearchPalette } from "./SearchPalette";

export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
        aria-label="Search"
      >
        <SearchIcon className="size-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </Button>
      <SearchPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
