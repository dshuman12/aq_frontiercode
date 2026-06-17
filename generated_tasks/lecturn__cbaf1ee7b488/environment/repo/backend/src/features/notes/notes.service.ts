import { and, asc, eq } from "drizzle-orm";
import { db } from "~/db/client";
import { courses, episodes, highlights, notes } from "~/db/schema";
import { assertLibraryAccess } from "~/features/libraries/access";

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

export const notesService = {
  async list(episodeId: string, userId: string) {
    const lib = await libraryIdForEpisode(episodeId);
    if (!lib) return [];
    await assertLibraryAccess(lib, userId, "viewer");
    return db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.episodeId, episodeId)))
      .orderBy(asc(notes.atSec), asc(notes.createdAt));
  },

  async create(input: {
    userId: string;
    episodeId: string;
    body: string;
    atSec?: number | null;
  }) {
    const lib = await libraryIdForEpisode(input.episodeId);
    if (!lib) throw new Error("Episode not found");
    await assertLibraryAccess(lib, input.userId, "viewer");
    const [row] = await db
      .insert(notes)
      .values({
        userId: input.userId,
        episodeId: input.episodeId,
        body: input.body,
        atSec: input.atSec ?? null,
      })
      .returning();
    if (!row) throw new Error("Failed to create note");
    return row;
  },

  async update(input: {
    noteId: string;
    userId: string;
    body?: string;
    atSec?: number | null;
  }) {
    const existing = await db.query.notes.findFirst({
      where: eq(notes.id, input.noteId),
    });
    if (!existing) throw new Error("Note not found");
    if (existing.userId !== input.userId) throw new Error("Forbidden");
    const patch: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() };
    if (input.body !== undefined) patch.body = input.body;
    if (input.atSec !== undefined) patch.atSec = input.atSec;
    const [row] = await db
      .update(notes)
      .set(patch)
      .where(eq(notes.id, input.noteId))
      .returning();
    return row ?? existing;
  },

  async remove(noteId: string, userId: string) {
    const existing = await db.query.notes.findFirst({
      where: eq(notes.id, noteId),
    });
    if (!existing) return;
    if (existing.userId !== userId) throw new Error("Forbidden");
    await db.delete(notes).where(eq(notes.id, noteId));
  },
};

export const highlightsService = {
  async list(episodeId: string, userId: string) {
    const lib = await libraryIdForEpisode(episodeId);
    if (!lib) return [];
    await assertLibraryAccess(lib, userId, "viewer");
    return db
      .select()
      .from(highlights)
      .where(and(eq(highlights.userId, userId), eq(highlights.episodeId, episodeId)))
      .orderBy(asc(highlights.startSec));
  },

  async create(input: {
    userId: string;
    episodeId: string;
    startSec: number;
    endSec: number;
    text?: string | null;
    color?: string;
    note?: string | null;
  }) {
    if (input.endSec <= input.startSec) {
      throw new Error("endSec must be greater than startSec");
    }
    const lib = await libraryIdForEpisode(input.episodeId);
    if (!lib) throw new Error("Episode not found");
    await assertLibraryAccess(lib, input.userId, "viewer");
    const [row] = await db
      .insert(highlights)
      .values({
        userId: input.userId,
        episodeId: input.episodeId,
        startSec: input.startSec,
        endSec: input.endSec,
        text: input.text ?? null,
        color: input.color ?? "amber",
        note: input.note ?? null,
      })
      .returning();
    if (!row) throw new Error("Failed to create highlight");
    return row;
  },

  async remove(highlightId: string, userId: string) {
    const existing = await db.query.highlights.findFirst({
      where: eq(highlights.id, highlightId),
    });
    if (!existing) return;
    if (existing.userId !== userId) throw new Error("Forbidden");
    await db.delete(highlights).where(eq(highlights.id, highlightId));
  },
};
