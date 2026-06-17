import { FlashcardReview } from "~/features/flashcards/FlashcardReview";

export default function ReviewPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Daily review</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Cards scheduled by the spaced-repetition engine. Press{" "}
          <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1 text-xs">
            Space
          </kbd>{" "}
          to flip,{" "}
          <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1 text-xs">
            1
          </kbd>
          –
          <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1 text-xs">
            4
          </kbd>{" "}
          to rate.
        </p>
      </header>
      <FlashcardReview />
    </div>
  );
}
