import { and, eq } from "drizzle-orm";
import { db } from "~/db/client";
import { chapters, courses, episodes, libraries, subtitles } from "~/db/schema";
import { enqueueTranscode } from "~/features/transcode/queue";
import { probeMany } from "./ffprobe";
import {
  type ScannedEpisode,
  type ScannedSubtitle,
  scanLibrary,
} from "./library.scanner";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const libraryService = {
  // Existing courses (libraryId, sourcePath) are skipped; deletions on disk are not auto-pruned.
  async sync(libraryId: string) {
    const lib = await db.query.libraries.findFirst({
      where: eq(libraries.id, libraryId),
    });
    if (!lib) throw new Error("Library not found");

    const scanned = await scanLibrary(lib.sourcePath);
    let inserted = 0;

    for (const sc of scanned) {
      const existing = await db.query.courses.findFirst({
        where: and(
          eq(courses.libraryId, libraryId),
          eq(courses.sourcePath, sc.sourcePath),
        ),
      });
      if (existing) continue;

      const slug = slugify(sc.title);
      const allEpisodes = sc.chapters.length
        ? sc.chapters.flatMap((c) => c.episodes)
        : sc.flatEpisodes;

      const durations = await probeMany(allEpisodes.map((e) => e.filePath));
      const totalDurationSec = Array.from(durations.values()).reduce((a, b) => a + b, 0);

      const [course] = await db
        .insert(courses)
        .values({
          libraryId,
          title: sc.title,
          slug,
          sourcePath: sc.sourcePath,
          episodeCount: allEpisodes.length,
          totalDurationSec,
        })
        .returning();
      if (!course) continue;

      const chapterIdByPos = new Map<number, string>();
      if (sc.chapters.length > 0) {
        const chapterRows = await db
          .insert(chapters)
          .values(
            sc.chapters.map((c) => ({
              courseId: course.id,
              title: c.title,
              position: c.position,
            })),
          )
          .returning({ id: chapters.id, position: chapters.position });
        for (const r of chapterRows) chapterIdByPos.set(r.position, r.id);
      }

      const epRows = sc.chapters.length
        ? sc.chapters.flatMap((c) =>
            c.episodes.map((e) => ({
              courseId: course.id,
              chapterId: chapterIdByPos.get(c.position) ?? null,
              title: e.title,
              filePath: e.filePath,
              fileSizeBytes: e.fileSizeBytes,
              durationSec: durations.get(e.filePath) ?? 0,
              position: e.position,
            })),
          )
        : sc.flatEpisodes.map((e) => ({
            courseId: course.id,
            chapterId: null,
            title: e.title,
            filePath: e.filePath,
            fileSizeBytes: e.fileSizeBytes,
            durationSec: durations.get(e.filePath) ?? 0,
            position: e.position,
          }));

      let insertedEpisodes: { id: string; filePath: string }[] = [];
      if (epRows.length) {
        insertedEpisodes = await db
          .insert(episodes)
          .values(epRows)
          .returning({ id: episodes.id, filePath: episodes.filePath });
      }

      // Second pass keeps the episode insert a single batch; pair via filePath which is unique.
      const scannedByPath = new Map<string, ScannedEpisode>(
        allEpisodes.map((e) => [e.filePath, e]),
      );
      const subtitleRows: Array<{
        episodeId: string;
        language: string;
        label: string;
        format: string;
        filePath: string;
        isDefault: number;
      }> = [];
      for (const ep of insertedEpisodes) {
        const scanned = scannedByPath.get(ep.filePath);
        if (!scanned || scanned.subtitles.length === 0) continue;
        const seenLangs = new Set<string>();
        scanned.subtitles.forEach((sub: ScannedSubtitle, i: number) => {
          // Dedup per-episode languages — the unique (episodeId, language) index would reject dupes.
          if (seenLangs.has(sub.language)) return;
          seenLangs.add(sub.language);
          subtitleRows.push({
            episodeId: ep.id,
            language: sub.language,
            label: sub.label,
            format: sub.format,
            filePath: sub.filePath,
            isDefault: i === 0 ? 1 : 0,
          });
        });
      }
      if (subtitleRows.length) await db.insert(subtitles).values(subtitleRows);

      for (const { id } of insertedEpisodes) {
        try {
          await enqueueTranscode(id);
        } catch (err) {
          console.warn(`[library.sync] failed to enqueue transcode for ${id}:`, err);
        }
      }
      inserted += 1;
    }

    return { scanned: scanned.length, inserted };
  },
};
