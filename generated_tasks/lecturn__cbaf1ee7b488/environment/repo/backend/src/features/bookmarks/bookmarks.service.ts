import { and, asc, eq } from "drizzle-orm";
import { db } from "~/db/client";
import { bookmarks, courses, episodes } from "~/db/schema";
import { assertLibraryAccess } from "~/features/libraries/access";

async function episodeLibraryId(episodeId: string): Promise<string | null> {
  const row = await db
    .select({ libraryId: courses.libraryId })
    .from(episodes)
    .innerJoin(courses, eq(courses.id, episodes.courseId))
    .where(eq(episodes.id, episodeId))
    .limit(1)
    .then((r) => r[0]);
  return row?.libraryId ?? null;
}

export const bookmarksService = {
  async list(episodeId: string, userId: string) {
    const lib = await episodeLibraryId(episodeId);
    if (!lib) return [];
    await assertLibraryAccess(lib, userId, "viewer");
    return db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.episodeId, episodeId)))
      .orderBy(asc(bookmarks.atSec));
  },

  async create(input: {
    userId: string;
    episodeId: string;
    atSec: number;
    label?: string;
  }) {
    const lib = await episodeLibraryId(input.episodeId);
    if (!lib) throw new Error("Episode not found");
    await assertLibraryAccess(lib, input.userId, "viewer");
    const [row] = await db
      .insert(bookmarks)
      .values({
        userId: input.userId,
        episodeId: input.episodeId,
        atSec: input.atSec,
        label: input.label ?? null,
      })
      .returning();
    if (!row) throw new Error("Failed to create bookmark");
    return row;
  },

  async update(input: {
    bookmarkId: string;
    userId: string;
    label?: string | null;
    atSec?: number;
  }) {
    const existing = await db.query.bookmarks.findFirst({
      where: eq(bookmarks.id, input.bookmarkId),
    });
    if (!existing) throw new Error("Bookmark not found");
    if (existing.userId !== input.userId) throw new Error("Forbidden");

    const patch: Partial<typeof bookmarks.$inferInsert> = {};
    if (input.label !== undefined) patch.label = input.label;
    if (input.atSec !== undefined) patch.atSec = input.atSec;
    if (Object.keys(patch).length === 0) return existing;
    const [row] = await db
      .update(bookmarks)
      .set(patch)
      .where(eq(bookmarks.id, input.bookmarkId))
      .returning();
    return row ?? existing;
  },

  async remove(bookmarkId: string, userId: string) {
    const existing = await db.query.bookmarks.findFirst({
      where: eq(bookmarks.id, bookmarkId),
    });
    if (!existing) return;
    if (existing.userId !== userId) throw new Error("Forbidden");
    await db.delete(bookmarks).where(eq(bookmarks.id, bookmarkId));
  },
};
