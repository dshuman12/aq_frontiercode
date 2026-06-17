import { sql } from "drizzle-orm";
import { db } from "~/db/client";

interface CourseHit {
  type: "course";
  id: string;
  libraryId: string;
  title: string;
  description: string | null;
  rank: number;
}

interface EpisodeHit {
  type: "episode";
  id: string;
  libraryId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  rank: number;
}

export type SearchHit = CourseHit | EpisodeHit;

// Tokens get prefix-matched with `:*` so the search updates as the user types.
function toTsquery(query: string): string {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]+/g, ""))
    .filter((t) => t.length >= 2)
    .map((t) => `${t}:*`)
    .join(" & ");
}

export const searchService = {
  // Postgres FTS over the migrations' generated `search_vector` columns; scoped to visible libraries.
  async search(query: string, userId: string, limit = 20): Promise<SearchHit[]> {
    const ts = toTsquery(query);
    if (ts.length === 0) return [];

    // drizzle.execute returns array-like rows directly (no `{ rows }` wrapper); cast to silence TS.
    const courseRows = (await db.execute(sql`
      SELECT c.id,
             c.library_id,
             c.title,
             c.description,
             ts_rank_cd(c.search_vector, to_tsquery('simple', ${ts})) AS rank
      FROM courses c
      WHERE c.search_vector @@ to_tsquery('simple', ${ts})
        AND c.library_id IN (
          SELECT id FROM libraries WHERE owner_id = ${userId}
          UNION
          SELECT library_id FROM library_shares WHERE user_id = ${userId}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `)) as unknown as Array<{
      id: string;
      library_id: string;
      title: string;
      description: string | null;
      rank: number | string;
    }>;

    const episodeRows = (await db.execute(sql`
      SELECT e.id,
             c.library_id,
             c.id AS course_id,
             c.title AS course_title,
             e.title,
             ts_rank_cd(e.search_vector, to_tsquery('simple', ${ts})) AS rank
      FROM episodes e
      INNER JOIN courses c ON c.id = e.course_id
      WHERE e.search_vector @@ to_tsquery('simple', ${ts})
        AND c.library_id IN (
          SELECT id FROM libraries WHERE owner_id = ${userId}
          UNION
          SELECT library_id FROM library_shares WHERE user_id = ${userId}
        )
      ORDER BY rank DESC
      LIMIT ${limit}
    `)) as unknown as Array<{
      id: string;
      library_id: string;
      course_id: string;
      course_title: string;
      title: string;
      rank: number | string;
    }>;

    const courses: CourseHit[] = Array.from(courseRows).map((r) => ({
      type: "course" as const,
      id: r.id,
      libraryId: r.library_id,
      title: r.title,
      description: r.description,
      rank: Number(r.rank),
    }));
    const episodes: EpisodeHit[] = Array.from(episodeRows).map((r) => ({
      type: "episode" as const,
      id: r.id,
      libraryId: r.library_id,
      courseId: r.course_id,
      courseTitle: r.course_title,
      title: r.title,
      rank: Number(r.rank),
    }));

    // Interleave courses and episodes by rank so the strongest matches come first regardless of type.
    return [...courses, ...episodes].sort((a, b) => b.rank - a.rank).slice(0, limit);
  },
};

export { toTsquery };
