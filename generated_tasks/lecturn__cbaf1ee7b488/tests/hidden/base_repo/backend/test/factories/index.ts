import { randomUUID } from "node:crypto";
import {
  accounts,
  chapters,
  courses,
  episodes,
  libraries,
  libraryShares,
  progress,
  sessions,
  subtitles,
  transcodeJobs,
  transcodeRenditions,
  users,
} from "~/db/schema";
import { testDb } from "../helpers/db";

let seq = 0;
const next = () => ++seq;

// Factory builders. Each takes an optional `overrides` partial so tests can
// pin specific columns while letting the rest auto-populate.

export async function makeUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const i = next();
  const [row] = await testDb
    .insert(users)
    .values({
      name: `User ${i}`,
      email: `user${i}@test.local`,
      emailVerified: true,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("makeUser failed");
  return row;
}

export async function makeAccount(
  userId: string,
  overrides: Partial<typeof accounts.$inferInsert> = {},
) {
  const [row] = await testDb
    .insert(accounts)
    .values({
      userId,
      providerId: "credential",
      accountId: userId,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("makeAccount failed");
  return row;
}

export async function makeSession(
  userId: string,
  overrides: Partial<typeof sessions.$inferInsert> = {},
) {
  const i = next();
  const [row] = await testDb
    .insert(sessions)
    .values({
      userId,
      token: `tok-${i}-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("makeSession failed");
  return row;
}

export async function makeLibrary(
  ownerId: string,
  overrides: Partial<typeof libraries.$inferInsert> = {},
) {
  const i = next();
  const [row] = await testDb
    .insert(libraries)
    .values({
      ownerId,
      name: `Library ${i}`,
      sourcePath: `/tmp/lib-${i}`,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("makeLibrary failed");
  return row;
}

export async function makeShare(
  libraryId: string,
  userId: string,
  overrides: Partial<typeof libraryShares.$inferInsert> = {},
) {
  const [row] = await testDb
    .insert(libraryShares)
    .values({ libraryId, userId, role: "viewer", ...overrides })
    .returning();
  if (!row) throw new Error("makeShare failed");
  return row;
}

export async function makeCourse(
  libraryId: string,
  overrides: Partial<typeof courses.$inferInsert> = {},
) {
  const i = next();
  const [row] = await testDb
    .insert(courses)
    .values({
      libraryId,
      title: `Course ${i}`,
      slug: `course-${i}`,
      sourcePath: `/tmp/course-${i}`,
      episodeCount: 1,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("makeCourse failed");
  return row;
}

export async function makeChapter(
  courseId: string,
  overrides: Partial<typeof chapters.$inferInsert> = {},
) {
  const i = next();
  const [row] = await testDb
    .insert(chapters)
    .values({ courseId, title: `Chapter ${i}`, position: i, ...overrides })
    .returning();
  if (!row) throw new Error("makeChapter failed");
  return row;
}

export async function makeEpisode(
  courseId: string,
  overrides: Partial<typeof episodes.$inferInsert> = {},
) {
  const i = next();
  const [row] = await testDb
    .insert(episodes)
    .values({
      courseId,
      title: `Episode ${i}`,
      filePath: `/tmp/episode-${i}-${randomUUID()}.mp4`,
      fileSizeBytes: 1_000_000,
      durationSec: 120,
      position: i,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("makeEpisode failed");
  return row;
}

export async function makeProgress(
  userId: string,
  episodeId: string,
  overrides: Partial<typeof progress.$inferInsert> = {},
) {
  const [row] = await testDb
    .insert(progress)
    .values({ userId, episodeId, positionSec: 30, ...overrides })
    .returning();
  if (!row) throw new Error("makeProgress failed");
  return row;
}

export async function makeSubtitle(
  episodeId: string,
  overrides: Partial<typeof subtitles.$inferInsert> = {},
) {
  const i = next();
  const [row] = await testDb
    .insert(subtitles)
    .values({
      episodeId,
      language: "en",
      label: "English",
      format: "vtt",
      filePath: `/tmp/sub-${i}.vtt`,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("makeSubtitle failed");
  return row;
}

export async function makeTranscodeJob(
  episodeId: string,
  overrides: Partial<typeof transcodeJobs.$inferInsert> = {},
) {
  const [row] = await testDb
    .insert(transcodeJobs)
    .values({ episodeId, status: "pending", ...overrides })
    .returning();
  if (!row) throw new Error("makeTranscodeJob failed");
  return row;
}

export async function makeTranscodeRendition(
  episodeId: string,
  overrides: Partial<typeof transcodeRenditions.$inferInsert> = {},
) {
  const [row] = await testDb
    .insert(transcodeRenditions)
    .values({
      episodeId,
      height: 720,
      width: 1280,
      bitrateKbps: 2800,
      codec: "h264",
      manifestPath: "720p/index.m3u8",
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("makeTranscodeRendition failed");
  return row;
}

// Build a complete user → library → course → episode chain for tests that
// need an end-to-end setup without touching every factory by hand.
export async function makeFullChain() {
  const owner = await makeUser();
  const library = await makeLibrary(owner.id);
  const course = await makeCourse(library.id);
  const chapter = await makeChapter(course.id);
  const episode = await makeEpisode(course.id, { chapterId: chapter.id });
  return { owner, library, course, chapter, episode };
}
