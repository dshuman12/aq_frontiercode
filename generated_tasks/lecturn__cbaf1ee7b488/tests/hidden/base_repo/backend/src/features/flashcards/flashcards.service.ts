import { and, asc, eq, lte } from "drizzle-orm";
import { db } from "~/db/client";
import {
  courses,
  episodes,
  flashcardReviews,
  flashcards,
  notes,
} from "~/db/schema";
import { assertLibraryAccess } from "~/features/libraries/access";
import { applyReview, type CardState, type Rating } from "./fsrs";

async function libraryIdForEpisode(episodeId: string): Promise<string | null> {
  const row = await db
    .select({ libraryId: courses.libraryId })
    .from(episodes)
    .innerJoin(courses, eq(courses.id, episodes.courseId))
    .where(eq(episodes.id, episodeId))
    .limit(1)
    .then((r) => r[0]);
  return row?.libraryId ?? null;
}

async function libraryIdForCourse(courseId: string): Promise<string | null> {
  const row = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    columns: { libraryId: true },
  });
  return row?.libraryId ?? null;
}

export const flashcardsService = {
  async list(input: { userId: string; episodeId?: string; courseId?: string }) {
    const filters = [eq(flashcards.userId, input.userId)];
    if (input.episodeId) filters.push(eq(flashcards.episodeId, input.episodeId));
    if (input.courseId) filters.push(eq(flashcards.courseId, input.courseId));
    return db
      .select()
      .from(flashcards)
      .where(and(...filters))
      .orderBy(asc(flashcards.dueAt));
  },

  async listDue(userId: string, now: Date = new Date(), limit = 100) {
    return db
      .select()
      .from(flashcards)
      .where(and(eq(flashcards.userId, userId), lte(flashcards.dueAt, now)))
      .orderBy(asc(flashcards.dueAt))
      .limit(limit);
  },

  async create(input: {
    userId: string;
    front: string;
    back: string;
    episodeId?: string | null;
    courseId?: string | null;
    sourceNoteId?: string | null;
  }) {
    if (input.episodeId) {
      const lib = await libraryIdForEpisode(input.episodeId);
      if (!lib) throw new Error("Episode not found");
      await assertLibraryAccess(lib, input.userId, "viewer");
    } else if (input.courseId) {
      const lib = await libraryIdForCourse(input.courseId);
      if (!lib) throw new Error("Course not found");
      await assertLibraryAccess(lib, input.userId, "viewer");
    }
    if (input.sourceNoteId) {
      const note = await db.query.notes.findFirst({
        where: eq(notes.id, input.sourceNoteId),
      });
      if (!note || note.userId !== input.userId) {
        throw new Error("Source note not found");
      }
    }

    const [row] = await db
      .insert(flashcards)
      .values({
        userId: input.userId,
        front: input.front,
        back: input.back,
        episodeId: input.episodeId ?? null,
        courseId: input.courseId ?? null,
        sourceNoteId: input.sourceNoteId ?? null,
      })
      .returning();
    if (!row) throw new Error("Failed to create flashcard");
    return row;
  },

  async update(input: {
    cardId: string;
    userId: string;
    front?: string;
    back?: string;
  }) {
    const existing = await db.query.flashcards.findFirst({
      where: eq(flashcards.id, input.cardId),
    });
    if (!existing) throw new Error("Card not found");
    if (existing.userId !== input.userId) throw new Error("Forbidden");
    const patch: Partial<typeof flashcards.$inferInsert> = { updatedAt: new Date() };
    if (input.front !== undefined) patch.front = input.front;
    if (input.back !== undefined) patch.back = input.back;
    const [row] = await db
      .update(flashcards)
      .set(patch)
      .where(eq(flashcards.id, input.cardId))
      .returning();
    return row ?? existing;
  },

  async remove(cardId: string, userId: string) {
    const existing = await db.query.flashcards.findFirst({
      where: eq(flashcards.id, cardId),
    });
    if (!existing) return;
    if (existing.userId !== userId) throw new Error("Forbidden");
    await db.delete(flashcards).where(eq(flashcards.id, cardId));
  },

  async review(input: { cardId: string; userId: string; rating: Rating }) {
    const existing = await db.query.flashcards.findFirst({
      where: eq(flashcards.id, input.cardId),
    });
    if (!existing) throw new Error("Card not found");
    if (existing.userId !== input.userId) throw new Error("Forbidden");

    const outcome = applyReview(
      {
        state: existing.state as CardState,
        stability: existing.stability,
        difficulty: existing.difficulty,
        reps: existing.reps,
        lapses: existing.lapses,
        lastReviewedAt: existing.lastReviewedAt ?? null,
      },
      input.rating,
    );

    await db.transaction(async (tx) => {
      await tx
        .update(flashcards)
        .set({
          state: outcome.state,
          stability: outcome.stability,
          difficulty: outcome.difficulty,
          reps: outcome.reps,
          lapses: outcome.lapses,
          lastReviewedAt: outcome.lastReviewedAt,
          dueAt: outcome.dueAt,
          updatedAt: new Date(),
        })
        .where(eq(flashcards.id, input.cardId));

      await tx.insert(flashcardReviews).values({
        cardId: input.cardId,
        userId: input.userId,
        rating: input.rating,
        elapsedDays: outcome.elapsedDays,
        scheduledDays: outcome.scheduledDays,
        stability: outcome.stability,
        difficulty: outcome.difficulty,
      });
    });

    return outcome;
  },
};
