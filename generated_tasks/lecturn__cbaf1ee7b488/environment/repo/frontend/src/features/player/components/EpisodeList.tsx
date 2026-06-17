"use client";

import { CheckCircle2, Circle, Play } from "lucide-react";
import { cn, formatDuration } from "~/lib/utils";
import type { CourseChapter, CourseEpisode } from "~/features/courses/types";

interface Props {
  chapters: CourseChapter[];
  activeId: string | null;
  onSelect: (ep: CourseEpisode) => void;
}

export function EpisodeList({ chapters, activeId, onSelect }: Props) {
  return (
    <div className="space-y-6">
      {chapters.map((ch) => (
        <div key={ch.id} className="space-y-2">
          {chapters.length > 1 && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] px-1">
              {ch.title}
            </h3>
          )}
          <ul className="space-y-1">
            {ch.episodes.map((ep) => {
              const isActive = ep.id === activeId;
              return (
                <li key={ep.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(ep)}
                    className={cn(
                      "group w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      isActive
                        ? "bg-[var(--color-amber-accent)]/10 text-[var(--foreground)]"
                        : "hover:bg-[var(--muted)] text-[var(--foreground)]/90",
                    )}
                  >
                    <span className="shrink-0">
                      {ep.completed ? (
                        <CheckCircle2 className="size-4 text-[var(--color-amber-accent)]" />
                      ) : isActive ? (
                        <Play className="size-4 text-[var(--color-amber-accent)] fill-current" />
                      ) : (
                        <Circle className="size-4 text-[var(--muted-foreground)]" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0 text-sm truncate">{ep.title}</span>
                    <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                      {formatDuration(ep.durationSec)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
