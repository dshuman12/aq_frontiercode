"use client";

import { Loader2, PlayCircle, X } from "lucide-react";
import Link from "next/link";
import { Card, CardBody } from "~/components/ui/card";
import { formatDuration } from "~/lib/utils";
import { useQueue, useRemoveFromQueue } from "./hooks";
import type { QueueItem } from "./types";

export function WatchLaterRail() {
  const { data, isLoading } = useQueue();
  const remove = useRemoveFromQueue();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  const continueWatching = data?.continueWatching ?? [];
  const queued = data?.queued ?? [];

  return (
    <div className="space-y-8">
      {continueWatching.length > 0 && (
        <Section
          title="Continue watching"
          items={continueWatching}
          onRemove={null}
        />
      )}
      {queued.length > 0 && (
        <Section
          title="Up next"
          items={queued}
          onRemove={(id) => remove.mutate(id)}
        />
      )}
      {continueWatching.length === 0 && queued.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
          Nothing in the queue. Add an episode from the player to get started.
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  onRemove,
}: {
  title: string;
  items: QueueItem[];
  onRemove: ((episodeId: string) => void) | null;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
        {items.map((it) => (
          <li key={it.episodeId}>
            <Card className="group h-full">
              <Link href={`/courses/${it.courseId}`}>
                <CardBody className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h3 className="text-sm font-medium truncate">
                        {it.episodeTitle}
                      </h3>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">
                        {it.courseTitle}
                      </p>
                    </div>
                    <PlayCircle className="size-5 text-[var(--color-amber-accent)] shrink-0" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    <span>
                      {it.positionSec > 0
                        ? `${Math.round((it.positionSec / it.episodeDurationSec) * 100)}% watched`
                        : formatDuration(it.episodeDurationSec)}
                    </span>
                    {onRemove && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onRemove(it.episodeId);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                        aria-label="Remove from queue"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </CardBody>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
