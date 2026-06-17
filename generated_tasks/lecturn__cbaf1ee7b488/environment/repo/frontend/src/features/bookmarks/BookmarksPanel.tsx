"use client";

import { Bookmark, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { formatTimestamp } from "~/lib/format-time";
import {
  useBookmarks,
  useCreateBookmark,
  useDeleteBookmark,
} from "./hooks";

interface Props {
  episodeId: string;
  currentTime: number;
  onSeek?: (atSec: number) => void;
}

export function BookmarksPanel({ episodeId, currentTime, onSeek }: Props) {
  const { data, isLoading } = useBookmarks(episodeId);
  const create = useCreateBookmark(episodeId);
  const remove = useDeleteBookmark(episodeId);
  const [label, setLabel] = useState("");

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      atSec: Math.max(0, Math.floor(currentTime)),
      label: label.trim() || undefined,
    });
    setLabel("");
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Bookmarks
        </h3>
        <span className="text-xs text-[var(--muted-foreground)]">
          {data?.length ?? 0}
        </span>
      </header>

      <form onSubmit={onAdd} className="flex gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={`Pin ${formatTimestamp(currentTime)}`}
          maxLength={120}
          aria-label="Bookmark label"
        />
        <Button
          type="submit"
          variant="accent"
          size="sm"
          disabled={create.isPending}
          aria-label="Add bookmark"
        >
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </Button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-4 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : data && data.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)] py-4 text-center">
          No bookmarks yet — pin the current spot with the button above.
        </p>
      ) : (
        <ul className="space-y-1">
          {data?.map((b) => (
            <li
              key={b.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--muted)] transition-colors"
            >
              <button
                type="button"
                onClick={() => onSeek?.(b.atSec)}
                className="flex flex-1 items-center gap-2 min-w-0 text-left text-sm"
              >
                <Bookmark className="size-3.5 shrink-0 text-[var(--color-amber-accent)]" />
                <span className="font-mono text-xs text-[var(--muted-foreground)] tabular-nums">
                  {formatTimestamp(b.atSec)}
                </span>
                <span className="truncate">{b.label || "Bookmark"}</span>
              </button>
              <button
                type="button"
                onClick={() => remove.mutate(b.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-red-500"
                aria-label="Delete bookmark"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
