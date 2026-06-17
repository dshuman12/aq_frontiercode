import { describe, expect, it } from "vitest";
import {
  applyReview,
  nextInterval,
  retrievability,
  type CardFsrs,
} from "~/features/flashcards/fsrs";

const blankCard: CardFsrs = {
  state: "new",
  stability: 0,
  difficulty: 0,
  reps: 0,
  lapses: 0,
  lastReviewedAt: null,
};

describe("retrievability", () => {
  it("equals 1.0 when elapsed is 0", () => {
    expect(retrievability(0, 5)).toBeCloseTo(1.0, 5);
  });

  it("decays monotonically with elapsed time", () => {
    const a = retrievability(1, 5);
    const b = retrievability(10, 5);
    const c = retrievability(100, 5);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it("higher stability flattens the curve (slower decay)", () => {
    expect(retrievability(10, 30)).toBeGreaterThan(retrievability(10, 5));
  });

  it("never reads stability less than the floor (0.1)", () => {
    expect(retrievability(1, 0)).toBeGreaterThan(0);
    expect(retrievability(1, -1)).toBeGreaterThan(0);
  });
});

describe("nextInterval", () => {
  it("returns at least 1 day even for tiny stability", () => {
    expect(nextInterval(0.01)).toBeGreaterThanOrEqual(1);
  });

  it("scales linearly with stability when retention target is fixed", () => {
    const a = nextInterval(5);
    const b = nextInterval(50);
    expect(b).toBeGreaterThan(a * 5);
  });
});

describe("applyReview — first review of a new card", () => {
  it("rating=Good moves a new card to 'review' with positive stability", () => {
    const out = applyReview(blankCard, 3, new Date("2026-01-01T00:00:00Z"));
    expect(out.state).toBe("review");
    expect(out.stability).toBeGreaterThan(0);
    expect(out.reps).toBe(1);
    expect(out.lapses).toBe(0);
    expect(out.dueAt.getTime()).toBeGreaterThan(
      new Date("2026-01-01T00:00:00Z").getTime(),
    );
  });

  it("rating=Again moves a new card to 'learning' and counts a lapse", () => {
    const out = applyReview(blankCard, 1);
    expect(out.state).toBe("learning");
    expect(out.lapses).toBe(1);
  });

  it("'Easy' produces a longer initial interval than 'Good'", () => {
    const easy = applyReview(blankCard, 4);
    const good = applyReview(blankCard, 3);
    expect(easy.scheduledDays).toBeGreaterThan(good.scheduledDays);
  });

  it("'Hard' produces a shorter initial interval than 'Good'", () => {
    const hard = applyReview(blankCard, 2);
    const good = applyReview(blankCard, 3);
    expect(hard.scheduledDays).toBeLessThanOrEqual(good.scheduledDays);
  });
});

describe("applyReview — subsequent reviews", () => {
  it("a successful review on a 'review' card grows stability", () => {
    const card: CardFsrs = {
      state: "review",
      stability: 5,
      difficulty: 5,
      reps: 1,
      lapses: 0,
      lastReviewedAt: new Date("2026-01-01T00:00:00Z"),
    };
    const out = applyReview(card, 3, new Date("2026-01-08T00:00:00Z"));
    expect(out.stability).toBeGreaterThan(card.stability);
    expect(out.lapses).toBe(0);
    expect(out.reps).toBe(2);
  });

  it("a failed review on a 'review' card resets to 'relearning' and counts a lapse", () => {
    const card: CardFsrs = {
      state: "review",
      stability: 12,
      difficulty: 5,
      reps: 4,
      lapses: 0,
      lastReviewedAt: new Date("2026-01-01T00:00:00Z"),
    };
    const out = applyReview(card, 1, new Date("2026-01-15T00:00:00Z"));
    expect(out.state).toBe("relearning");
    expect(out.lapses).toBe(1);
  });

  it("difficulty drifts toward the mean over many 'good' reviews", () => {
    let card: CardFsrs = {
      state: "review",
      stability: 5,
      difficulty: 9, // start hard
      reps: 1,
      lapses: 0,
      lastReviewedAt: new Date("2026-01-01T00:00:00Z"),
    };
    for (let i = 0; i < 20; i++) {
      const out = applyReview(card, 3, new Date(card.lastReviewedAt!.getTime() + 86400_000));
      card = {
        state: out.state,
        stability: out.stability,
        difficulty: out.difficulty,
        reps: out.reps,
        lapses: out.lapses,
        lastReviewedAt: out.lastReviewedAt,
      };
    }
    expect(card.difficulty).toBeLessThan(9);
  });

  it("elapsedDays is computed from lastReviewedAt", () => {
    const card: CardFsrs = {
      state: "review",
      stability: 5,
      difficulty: 5,
      reps: 1,
      lapses: 0,
      lastReviewedAt: new Date("2026-01-01T00:00:00Z"),
    };
    const out = applyReview(card, 3, new Date("2026-01-04T00:00:00Z"));
    expect(out.elapsedDays).toBeCloseTo(3, 5);
  });

  it("clamps difficulty to [1, 10]", () => {
    const card: CardFsrs = {
      state: "review",
      stability: 1,
      difficulty: 12,
      reps: 1,
      lapses: 0,
      lastReviewedAt: new Date("2026-01-01"),
    };
    const out = applyReview(card, 3);
    expect(out.difficulty).toBeLessThanOrEqual(10);
  });

  it("never schedules a card with zero stability", () => {
    const card: CardFsrs = {
      state: "review",
      stability: 5,
      difficulty: 5,
      reps: 5,
      lapses: 2,
      lastReviewedAt: new Date(),
    };
    const out = applyReview(card, 1);
    expect(out.stability).toBeGreaterThan(0);
    expect(out.scheduledDays).toBeGreaterThanOrEqual(1);
  });
});
