export type CardState = "new" | "learning" | "review" | "relearning";
export type CardRating = 1 | 2 | 3 | 4;

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  state: CardState;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string | null;
  episodeId: string | null;
  courseId: string | null;
  sourceNoteId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewOutcome {
  state: CardState;
  dueAt: string;
  scheduledDays: number;
}
