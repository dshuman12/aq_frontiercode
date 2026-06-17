"use client";

import { CheckCircle2, Loader2, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { useDueFlashcards, useReviewFlashcard } from "./hooks";
import type { CardRating } from "./types";

const RATING_LABELS: Record<CardRating, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

const RATING_HOTKEYS: Record<string, CardRating> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
};

interface Props {
  onComplete?: () => void;
}

export function FlashcardReview({ onComplete }: Props) {
  const { data: cards, isLoading } = useDueFlashcards(50);
  const review = useReviewFlashcard();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (cards && index >= cards.length && cards.length > 0) {
      onComplete?.();
    }
  }, [cards, index, onComplete]);

  const card = cards?.[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!card) return;
      if (e.key === " ") {
        e.preventDefault();
        setRevealed((v) => !v);
        return;
      }
      const hk = RATING_HOTKEYS[e.key];
      if (hk && revealed) {
        e.preventDefault();
        rate(hk);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, revealed]);

  async function rate(rating: CardRating) {
    if (!card) return;
    await review.mutateAsync({ cardId: card.id, rating });
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <Card>
        <CardBody className="space-y-2 text-center py-12">
          <CheckCircle2 className="mx-auto size-8 text-[var(--color-amber-accent)]" />
          <h2 className="font-display text-xl font-semibold">All caught up</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            No cards are due right now. New cards become available after their
            scheduled interval passes.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (!card) {
    return (
      <Card>
        <CardBody className="space-y-2 text-center py-12">
          <CheckCircle2 className="mx-auto size-8 text-[var(--color-amber-accent)]" />
          <h2 className="font-display text-xl font-semibold">Review complete</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            You reviewed {cards.length} card{cards.length === 1 ? "" : "s"} —
            keep the streak going tomorrow.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
        <span>
          {index + 1} of {cards.length}
        </span>
        <span className="font-mono text-xs">
          {card.state} · reps {card.reps} · lapses {card.lapses}
        </span>
      </header>

      <Card>
        <CardBody className="min-h-[200px] flex items-center justify-center text-center">
          <div className="space-y-4">
            <div className="font-display text-2xl whitespace-pre-wrap">{card.front}</div>
            {revealed && (
              <>
                <hr className="border-[var(--border)]" />
                <div className="text-base whitespace-pre-wrap">{card.back}</div>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {([1, 2, 3, 4] as CardRating[]).map((r) => (
            <Button
              key={r}
              variant={r === 1 ? "destructive" : r === 4 ? "accent" : "outline"}
              onClick={() => rate(r)}
              disabled={review.isPending}
              className="flex-col py-3 h-auto"
            >
              <span className="font-medium">{RATING_LABELS[r]}</span>
              <span className="text-[10px] opacity-70">{r}</span>
            </Button>
          ))}
        </div>
      ) : (
        <Button
          onClick={() => setRevealed(true)}
          variant="accent"
          className="w-full h-11"
        >
          <RotateCw className="size-4" /> Reveal answer
          <span className="ml-2 text-xs opacity-70">(space)</span>
        </Button>
      )}
    </div>
  );
}
