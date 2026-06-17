import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { courses, episodes, subtitles } from "~/db/schema";
import { resetTestDb, setupTestDb } from "../helpers/db";
import { makeUser, makeLibrary } from "../factories";

// Mock the scanner so we don't need real files on disk.
vi.mock("~/features/library/library.scanner", async () => {
  return {
    scanLibrary: vi.fn(),
  };
});
// Mock the ffprobe utility — sync calls probeMany() which spawns ffprobe.
vi.mock("~/features/library/ffprobe", async () => {
  return {
    probeMany: vi.fn(),
  };
});
// Mock the transcode queue so enqueue is a no-op (Redis isn't reachable in
// the unit-test process and we don't care about queue ordering here).
vi.mock("~/features/transcode/queue", async () => {
  return {
    enqueueTranscode: vi.fn().mockResolvedValue("fake-job-id"),
    transcodeQueue: { add: vi.fn() },
    transcodeQueueEvents: { on: vi.fn(), off: vi.fn() },
  };
});

// Import AFTER mocks are registered.
import { libraryService } from "~/features/library/library.service";
import { scanLibrary } from "~/features/library/library.scanner";
import { probeMany } from "~/features/library/ffprobe";
import { enqueueTranscode } from "~/features/transcode/queue";

const mockedScan = vi.mocked(scanLibrary);
const mockedProbe = vi.mocked(probeMany);
const mockedEnqueue = vi.mocked(enqueueTranscode);

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  mockedScan.mockReset();
  mockedProbe.mockReset();
  mockedEnqueue.mockReset();
  mockedEnqueue.mockResolvedValue("job-1");
});

describe("libraryService.sync", () => {
  it("inserts a course + chapter-shaped episodes from a chapter-style scan", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);

    mockedScan.mockResolvedValue([
      {
        title: "Course A",
        sourcePath: "/lib/course-a",
        chapters: [
          {
            title: "Intro",
            position: 1,
            episodes: [
              {
                title: "Welcome",
                position: 1,
                filePath: "/lib/course-a/01_Intro/01_Welcome.mp4",
                fileSizeBytes: 1024,
                subtitles: [],
              },
            ],
          },
        ],
        flatEpisodes: [],
      },
    ]);
    mockedProbe.mockResolvedValue(
      new Map([["/lib/course-a/01_Intro/01_Welcome.mp4", 60]]),
    );

    const result = await libraryService.sync(lib.id);
    expect(result).toEqual({ scanned: 1, inserted: 1 });

    const courseRows = await db.select().from(courses).where(eq(courses.libraryId, lib.id));
    expect(courseRows).toHaveLength(1);
    expect(courseRows[0]?.title).toBe("Course A");
    expect(courseRows[0]?.totalDurationSec).toBe(60);

    const epRows = await db
      .select()
      .from(episodes)
      .where(eq(episodes.courseId, courseRows[0]!.id));
    expect(epRows).toHaveLength(1);
    expect(epRows[0]?.durationSec).toBe(60);
  });

  it("inserts subtitle rows from sibling .vtt/.srt entries on each scanned episode", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    mockedScan.mockResolvedValue([
      {
        title: "Course B",
        sourcePath: "/lib/course-b",
        chapters: [],
        flatEpisodes: [
          {
            title: "Solo",
            position: 1,
            filePath: "/lib/course-b/01_Solo.mp4",
            fileSizeBytes: 1024,
            subtitles: [
              {
                language: "en",
                label: "English",
                format: "vtt",
                filePath: "/lib/course-b/01_Solo.en.vtt",
              },
              {
                language: "fr",
                label: "French",
                format: "srt",
                filePath: "/lib/course-b/01_Solo.fr.srt",
              },
            ],
          },
        ],
      },
    ]);
    mockedProbe.mockResolvedValue(
      new Map([["/lib/course-b/01_Solo.mp4", 30]]),
    );

    await libraryService.sync(lib.id);
    const subs = await db.select().from(subtitles);
    expect(subs).toHaveLength(2);
    const langs = subs.map((s) => s.language).sort();
    expect(langs).toEqual(["en", "fr"]);
  });

  it("dedupes subtitle languages within a single episode", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    mockedScan.mockResolvedValue([
      {
        title: "Course C",
        sourcePath: "/lib/course-c",
        chapters: [],
        flatEpisodes: [
          {
            title: "Solo",
            position: 1,
            filePath: "/lib/course-c/01.mp4",
            fileSizeBytes: 0,
            subtitles: [
              { language: "en", label: "EN1", format: "vtt", filePath: "/lib/course-c/01.en.vtt" },
              { language: "en", label: "EN2", format: "srt", filePath: "/lib/course-c/01.en.srt" },
            ],
          },
        ],
      },
    ]);
    mockedProbe.mockResolvedValue(new Map([["/lib/course-c/01.mp4", 0]]));
    await libraryService.sync(lib.id);
    const subs = await db.select().from(subtitles);
    expect(subs).toHaveLength(1);
    expect(subs[0]?.label).toBe("EN1"); // first one wins
  });

  it("skips courses already imported (matched by libraryId + sourcePath)", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    mockedScan.mockResolvedValue([
      {
        title: "Same",
        sourcePath: "/lib/same",
        chapters: [],
        flatEpisodes: [
          {
            title: "Ep",
            position: 1,
            filePath: "/lib/same/01.mp4",
            fileSizeBytes: 0,
            subtitles: [],
          },
        ],
      },
    ]);
    mockedProbe.mockResolvedValue(new Map([["/lib/same/01.mp4", 10]]));
    const first = await libraryService.sync(lib.id);
    expect(first).toEqual({ scanned: 1, inserted: 1 });
    const second = await libraryService.sync(lib.id);
    expect(second).toEqual({ scanned: 1, inserted: 0 });
  });

  it("enqueues a transcode job per inserted episode", async () => {
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    mockedScan.mockResolvedValue([
      {
        title: "Course D",
        sourcePath: "/lib/d",
        chapters: [],
        flatEpisodes: [
          {
            title: "A",
            position: 1,
            filePath: "/lib/d/01.mp4",
            fileSizeBytes: 0,
            subtitles: [],
          },
          {
            title: "B",
            position: 2,
            filePath: "/lib/d/02.mp4",
            fileSizeBytes: 0,
            subtitles: [],
          },
        ],
      },
    ]);
    mockedProbe.mockResolvedValue(
      new Map([
        ["/lib/d/01.mp4", 5],
        ["/lib/d/02.mp4", 5],
      ]),
    );
    await libraryService.sync(lib.id);
    expect(mockedEnqueue).toHaveBeenCalledTimes(2);
  });

  it("doesn't fail the sync when enqueue throws (Redis outage)", async () => {
    mockedEnqueue.mockRejectedValueOnce(new Error("redis unreachable"));
    const owner = await makeUser();
    const lib = await makeLibrary(owner.id);
    mockedScan.mockResolvedValue([
      {
        title: "Course E",
        sourcePath: "/lib/e",
        chapters: [],
        flatEpisodes: [
          {
            title: "A",
            position: 1,
            filePath: "/lib/e/01.mp4",
            fileSizeBytes: 0,
            subtitles: [],
          },
        ],
      },
    ]);
    mockedProbe.mockResolvedValue(new Map([["/lib/e/01.mp4", 5]]));
    await expect(libraryService.sync(lib.id)).resolves.toEqual({
      scanned: 1,
      inserted: 1,
    });
  });

  it("throws when the libraryId is unknown", async () => {
    await expect(
      libraryService.sync("00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow(/Library not found/);
  });
});
