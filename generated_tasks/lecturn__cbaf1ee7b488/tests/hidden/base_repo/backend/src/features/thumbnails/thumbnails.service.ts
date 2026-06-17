import { eq } from "drizzle-orm";
import { env } from "~/config/env";
import { db } from "~/db/client";
import { courses, episodeThumbnails, episodes } from "~/db/schema";
import {
  coverPath,
  extractCoverFrame,
  generateSpriteSheet,
  spriteSheetPath,
} from "./thumbnails";

const SPRITE_INTERVAL_SEC = 5;
const SPRITE_THUMB_WIDTH = 160;
const SPRITE_THUMB_HEIGHT = 90;

export const thumbnailsService = {
  // Idempotent — re-running rewrites the sheet and refreshes the row.
  async buildSpriteSheet(episodeId: string) {
    const ep = await db.query.episodes.findFirst({
      where: eq(episodes.id, episodeId),
    });
    if (!ep) throw new Error("Episode not found");
    if (ep.durationSec <= 0) return null;

    const out = spriteSheetPath(env.MEDIA_ROOT, episodeId);
    const result = await generateSpriteSheet({
      inputPath: ep.filePath,
      outputPath: out,
      durationSec: ep.durationSec,
      intervalSec: SPRITE_INTERVAL_SEC,
      thumbWidth: SPRITE_THUMB_WIDTH,
      thumbHeight: SPRITE_THUMB_HEIGHT,
    });

    const [row] = await db
      .insert(episodeThumbnails)
      .values({
        episodeId,
        spriteImagePath: out,
        intervalSec: SPRITE_INTERVAL_SEC,
        cols: result.cols,
        rows: result.rows,
        thumbWidth: SPRITE_THUMB_WIDTH,
        thumbHeight: SPRITE_THUMB_HEIGHT,
      })
      .onConflictDoUpdate({
        target: episodeThumbnails.episodeId,
        set: {
          spriteImagePath: out,
          intervalSec: SPRITE_INTERVAL_SEC,
          cols: result.cols,
          rows: result.rows,
          thumbWidth: SPRITE_THUMB_WIDTH,
          thumbHeight: SPRITE_THUMB_HEIGHT,
          createdAt: new Date(),
        },
      })
      .returning();
    return row ?? null;
  },

  // ~10% into the first episode skips intro/title cards while still hitting representative content.
  async buildCourseCover(courseId: string) {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      with: { episodes: { limit: 1 } },
    });
    if (!course) throw new Error("Course not found");
    const firstEp = course.episodes[0];
    if (!firstEp) return null;

    const at = Math.max(1, Math.floor(firstEp.durationSec * 0.1));
    const out = coverPath(env.MEDIA_ROOT, courseId);
    await extractCoverFrame({
      inputPath: firstEp.filePath,
      outputPath: out,
      atSec: at,
    });

    await db
      .update(courses)
      .set({ coverImagePath: out })
      .where(eq(courses.id, courseId));
    return out;
  },
};
