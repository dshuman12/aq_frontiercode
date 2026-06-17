import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "~/db/client";
import {
  courses,
  episodes,
  libraries,
  libraryShares,
  progress,
  watchLater,
} from "~/db/schema";
import { assertLibraryAccess } from "~/features/libraries/access";

interface QueueItem {
  episodeId: string;
  episodeTitle: string;
  episodeDurationSec: number;
  positionSec: number;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  libraryId: string;
  addedAt: Date | null;
  position: number | null;
  source: "queued" | "in_progress";
}

// Owned + shared library IDs, used to scope queue/continue-watching to playable episodes.
function callerLibraryIds(userId: string) {
  return sql<string[]>`(
    SELECT ${libraries.id} FROM ${libraries}
    WHERE ${libraries.ownerId} = ${userId}
    UNION
    SELECT ${libraryShares.libraryId} FROM ${libraryShares}
    WHERE ${libraryShares.userId} = ${userId}
  )`;
}

export const watchLaterService = {
  async listQueue(userId: string): Promise<QueueItem[]> {
    const rows = await db
      .select({
        watchLaterId: watchLater.id,
        addedAt: watchLater.addedAt,
        position: watchLater.position,
        episodeId: episodes.id,
        episodeTitle: episodes.title,
        episodeDurationSec: episodes.durationSec,
        courseId: courses.id,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        libraryId: courses.libraryId,
        positionSec: progress.positionSec,
      })
      .from(watchLater)
      .innerJoin(episodes, eq(episodes.id, watchLater.episodeId))
      .innerJoin(courses, eq(courses.id, episodes.courseId))
      .leftJoin(
        progress,
        and(eq(progress.episodeId, episodes.id), eq(progress.userId, userId)),
      )
      .where(
        and(
          eq(watchLater.userId, userId),
          sql`${courses.libraryId} IN ${callerLibraryIds(userId)}`,
        ),
      )
      .orderBy(asc(watchLater.position), asc(watchLater.addedAt));
    return rows.map((r) => ({
      episodeId: r.episodeId,
      episodeTitle: r.episodeTitle,
      episodeDurationSec: r.episodeDurationSec,
      courseId: r.courseId,
      courseTitle: r.courseTitle,
      courseSlug: r.courseSlug,
      libraryId: r.libraryId,
      addedAt: r.addedAt,
      position: r.position,
      positionSec: Number(r.positionSec ?? 0),
      source: "queued",
    }));
  },

  // Progress rows still in flight (positionSec > 0, not completed), most-recent first.
  async listContinueWatching(userId: string, limit = 20): Promise<QueueItem[]> {
    const rows = await db
      .select({
        episodeId: episodes.id,
        episodeTitle: episodes.title,
        episodeDurationSec: episodes.durationSec,
        courseId: courses.id,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        libraryId: courses.libraryId,
        positionSec: progress.positionSec,
        updatedAt: progress.updatedAt,
      })
      .from(progress)
      .innerJoin(episodes, eq(episodes.id, progress.episodeId))
      .innerJoin(courses, eq(courses.id, episodes.courseId))
      .where(
        and(
          eq(progress.userId, userId),
          eq(progress.completed, 0),
          sql`${progress.positionSec} > 0`,
          sql`${courses.libraryId} IN ${callerLibraryIds(userId)}`,
        ),
      )
      .orderBy(desc(progress.updatedAt))
      .limit(limit);
    return rows.map((r) => ({
      episodeId: r.episodeId,
      episodeTitle: r.episodeTitle,
      episodeDurationSec: r.episodeDurationSec,
      courseId: r.courseId,
      courseTitle: r.courseTitle,
      courseSlug: r.courseSlug,
      libraryId: r.libraryId,
      positionSec: Number(r.positionSec),
      addedAt: null,
      position: null,
      source: "in_progress",
    }));
  },

  async add(userId: string, episodeId: string) {
    const lib = await db
      .select({ libraryId: courses.libraryId })
      .from(episodes)
      .innerJoin(courses, eq(courses.id, episodes.courseId))
      .where(eq(episodes.id, episodeId))
      .limit(1)
      .then((r) => r[0]);
    if (!lib) throw new Error("Episode not found");
    await assertLibraryAccess(lib.libraryId, userId, "viewer");

    // New entries go to the tail of the queue.
    const maxPos = await db
      .select({ max: sql<number>`coalesce(max(${watchLater.position}), -1)` })
      .from(watchLater)
      .where(eq(watchLater.userId, userId))
      .then((r) => r[0]?.max ?? -1);

    const [row] = await db
      .insert(watchLater)
      .values({ userId, episodeId, position: Number(maxPos) + 1 })
      .onConflictDoNothing({
        target: [watchLater.userId, watchLater.episodeId],
      })
      .returning();
    return row;
  },

  async remove(userId: string, episodeId: string) {
    await db
      .delete(watchLater)
      .where(
        and(eq(watchLater.userId, userId), eq(watchLater.episodeId, episodeId)),
      );
  },

  async reorder(
    userId: string,
    orderedEpisodeIds: string[],
  ): Promise<void> {
    // The unique index on (userId, episodeId) makes concurrent reorders safe — last write wins.
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedEpisodeIds.length; i++) {
        await tx
          .update(watchLater)
          .set({ position: i })
          .where(
            and(
              eq(watchLater.userId, userId),
              eq(watchLater.episodeId, orderedEpisodeIds[i]!),
            ),
          );
      }
    });
  },
};

export type { QueueItem };
