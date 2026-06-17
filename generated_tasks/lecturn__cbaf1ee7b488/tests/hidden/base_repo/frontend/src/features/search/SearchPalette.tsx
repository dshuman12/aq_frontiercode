"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BookOpen,
  Film,
  Loader2,
  Search as SearchIcon,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSearch } from "./hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchPalette({ open, onOpenChange }: Props) {
  const [raw, setRaw] = useState("");
  const [debounced, setDebounced] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(raw), 150);
    return () => clearTimeout(handle);
  }, [raw]);

  useEffect(() => {
    if (!open) {
      setRaw("");
      setDebounced("");
    }
  }, [open]);

  const { data: hits, isLoading } = useSearch(debounced);

  function go(href: string) {
    onOpenChange(false);
    router.push(href as never);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[15%] z-50 w-[90vw] max-w-xl -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <SearchIcon className="size-4 text-[var(--muted-foreground)]" />
            <input
              autoFocus
              placeholder="Search courses and episodes…"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-[var(--muted-foreground)]"
            />
            {isLoading && raw && <Loader2 className="size-4 animate-spin" />}
            <DialogPrimitive.Close
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!debounced && (
              <p className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Type to search.
              </p>
            )}
            {debounced && !isLoading && hits && hits.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
                No matches for &ldquo;{debounced}&rdquo;.
              </p>
            )}
            <ul className="space-y-0.5">
              {hits?.map((hit) => (
                <li key={`${hit.type}-${hit.id}`}>
                  <button
                    type="button"
                    onClick={() =>
                      go(
                        hit.type === "course"
                          ? `/courses/${hit.id}`
                          : `/courses/${hit.courseId}`,
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-[var(--muted)] transition-colors"
                  >
                    {hit.type === "course" ? (
                      <BookOpen className="size-4 text-[var(--muted-foreground)] shrink-0" />
                    ) : (
                      <Film className="size-4 text-[var(--muted-foreground)] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {hit.title}
                      </div>
                      <div className="truncate text-xs text-[var(--muted-foreground)]">
                        {hit.type === "course"
                          ? hit.description ?? "Course"
                          : `Episode in ${hit.courseTitle}`}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
