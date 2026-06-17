// FSRS-4 reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki

export type Rating = 1 | 2 | 3 | 4;
export type CardState = "new" | "learning" | "review" | "relearning";

// Default 17 weights from the FSRS-4 paper.
const W = [
  0.4, 0.6, 2.4, 5.8,
  4.93, 0.94, 0.86, 0.01,
  1.49, 0.14, 0.94, 2.18,
  0.05, 0.34, 1.26, 0.29, 2.61,
] as const;

// Target 90% recall probability at the next review.
const REQUEST_RETENTION = 0.9;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const MIN_STABILITY = 0.1;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function initDifficulty(rating: Rating): number {
  return clamp(W[4] - (rating - 3) * W[5], MIN_DIFFICULTY, MAX_DIFFICULTY);
}

function initStability(rating: Rating): number {
  return Math.max(MIN_STABILITY, W[rating - 1]!);
}

function nextDifficulty(d: number, rating: Rating): number {
  // Mean-reverts toward W[4] (initial 'good' difficulty).
  const newD = d - W[6] * (rating - 3);
  return clamp(W[5] * W[4] + (1 - W[5]) * newD, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

function nextStabilitySuccess(
  d: number,
  s: number,
  r: number,
  rating: Rating,
): number {
  const hard = rating === 2 ? W[15] : 1;
  const easy = rating === 4 ? W[16] : 1;
  return Math.max(
    MIN_STABILITY,
    s *
      (1 +
        Math.exp(W[8]) *
          (11 - d) *
          Math.pow(s, -W[9]) *
          (Math.exp(W[10] * (1 - r)) - 1) *
          hard *
          easy),
  );
}

function nextStabilityFailure(d: number, s: number, r: number): number {
  return Math.max(
    MIN_STABILITY,
    W[11] *
      Math.pow(d, -W[12]) *
      (Math.pow(s + 1, W[13]) - 1) *
      Math.exp(W[14] * (1 - r)),
  );
}

// Forgetting curve R(t) = (1 + t/(9*S))^-1.
export function retrievability(elapsedDays: number, stability: number): number {
  return Math.pow(1 + elapsedDays / (9 * Math.max(MIN_STABILITY, stability)), -1);
}

// Round up to at least 1 day so a successful review never re-shows the same day.
export function nextInterval(stability: number): number {
  return Math.max(1, Math.round(9 * stability * (1 / REQUEST_RETENTION - 1)));
}

export interface CardFsrs {
  state: CardState;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReviewedAt: Date | null;
}

export interface ReviewOutcome {
  state: CardState;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReviewedAt: Date;
  dueAt: Date;
  elapsedDays: number;
  scheduledDays: number;
}

export function applyReview(
  card: CardFsrs,
  rating: Rating,
  now: Date = new Date(),
): ReviewOutcome {
  let { state, stability, difficulty, reps, lapses, lastReviewedAt } = card;

  let elapsedDays = 0;
  let r = 1;
  if (lastReviewedAt) {
    elapsedDays = Math.max(
      0,
      (now.getTime() - lastReviewedAt.getTime()) / 86_400_000,
    );
    r = retrievability(elapsedDays, stability);
  }

  if (state === "new") {
    difficulty = initDifficulty(rating);
    stability = initStability(rating);
    state = rating === 1 ? "learning" : "review";
    if (rating === 1) lapses += 1;
  } else {
    difficulty = nextDifficulty(difficulty, rating);
    if (rating === 1) {
      stability = nextStabilityFailure(difficulty, stability, r);
      state = "relearning";
      lapses += 1;
    } else {
      stability = nextStabilitySuccess(difficulty, stability, r, rating);
      state = "review";
    }
  }
  reps += 1;
  const scheduledDays = nextInterval(stability);
  const dueAt = new Date(now.getTime() + scheduledDays * 86_400_000);
  return {
    state,
    stability,
    difficulty,
    reps,
    lapses,
    lastReviewedAt: now,
    dueAt,
    elapsedDays,
    scheduledDays,
  };
}
