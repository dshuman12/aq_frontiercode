import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scanLibrary } from "~/features/library/library.scanner";

let root: string;

async function touch(path: string) {
  await writeFile(path, "");
}

beforeAll(async () => {
  root = join(tmpdir(), `lecturn-scanner-${Date.now()}`);
  await mkdir(root, { recursive: true });

  // Course A: chapter-style layout with named subtitles.
  const courseA = join(root, "Advanced TypeScript");
  await mkdir(join(courseA, "01 Intro"), { recursive: true });
  await touch(join(courseA, "01 Intro", "01 Welcome.mp4"));
  await touch(join(courseA, "01 Intro", "01 Welcome.en.vtt"));
  await touch(join(courseA, "01 Intro", "01 Welcome.fr.srt"));
  await touch(join(courseA, "01 Intro", "02 Setup.mp4"));
  await mkdir(join(courseA, "02 Generics"), { recursive: true });
  await touch(join(courseA, "02 Generics", "01 Lesson.mp4"));

  // Course B: flat layout, untagged subtitle (no language).
  const courseB = join(root, "WebGPU");
  await mkdir(courseB, { recursive: true });
  await touch(join(courseB, "001 Why WebGPU.mp4"));
  await touch(join(courseB, "001 Why WebGPU.vtt")); // untagged → "und"
  await touch(join(courseB, "002 Pipelines.mp4"));

  // Course C: empty folder (no videos) — scanner should drop these now.
  await mkdir(join(root, "Empty"), { recursive: true });

  // Course D: a folder with a name we explicitly skip (tool/repo artifact).
  await mkdir(join(root, "node_modules"), { recursive: true });
  await touch(join(root, "node_modules", "ignore-me.mp4"));

  // Course E: a hidden folder — never a course.
  await mkdir(join(root, ".cache"), { recursive: true });
  await touch(join(root, ".cache", "hidden.mp4"));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("scanLibrary", () => {
  it("emits a ScannedCourse only for folders that contain at least one .mp4", async () => {
    const courses = await scanLibrary(root);
    const titles = courses.map((c) => c.title).sort();
    // 'Empty' has no videos -> dropped. 'node_modules' is skipped by name
    // (even though it has an .mp4 inside). '.cache' is hidden -> dropped.
    expect(titles).toEqual(["Advanced TypeScript", "WebGPU"]);
  });

  it("groups episodes under chapter subfolders when present", async () => {
    const courses = await scanLibrary(root);
    const ts = courses.find((c) => c.title === "Advanced TypeScript")!;
    expect(ts.chapters.length).toBe(2);
    expect(ts.flatEpisodes).toEqual([]);

    const intro = ts.chapters.find((c) => c.title === "Intro")!;
    expect(intro.episodes.map((e) => e.title)).toEqual(["Welcome", "Setup"]);
    expect(intro.episodes[0]?.position).toBe(1);
    expect(intro.episodes[1]?.position).toBe(2);
  });

  it("uses flatEpisodes when no chapter subfolders exist", async () => {
    const courses = await scanLibrary(root);
    const wg = courses.find((c) => c.title === "WebGPU")!;
    expect(wg.chapters).toEqual([]);
    expect(wg.flatEpisodes.map((e) => e.title)).toEqual([
      "Why WebGPU",
      "Pipelines",
    ]);
  });

  it("attaches sibling subtitle files keyed by language tag", async () => {
    const courses = await scanLibrary(root);
    const intro = courses
      .find((c) => c.title === "Advanced TypeScript")!
      .chapters.find((c) => c.title === "Intro")!;
    const welcome = intro.episodes.find((e) => e.title === "Welcome")!;
    const langs = welcome.subtitles.map((s) => s.language).sort();
    expect(langs).toEqual(["en", "fr"]);
    const en = welcome.subtitles.find((s) => s.language === "en")!;
    expect(en.format).toBe("vtt");
    expect(en.label).toBe("English");
  });

  it("uses 'und' for subtitle files without a language tag", async () => {
    const courses = await scanLibrary(root);
    const wg = courses.find((c) => c.title === "WebGPU")!;
    const why = wg.flatEpisodes.find((e) => e.title === "Why WebGPU")!;
    expect(why.subtitles.length).toBe(1);
    expect(why.subtitles[0]?.language).toBe("und");
  });

  it("drops folders that contain zero episodes", async () => {
    const courses = await scanLibrary(root);
    expect(courses.find((c) => c.title === "Empty")).toBeUndefined();
  });

  it("skips well-known tool folders even when they contain .mp4 files", async () => {
    const courses = await scanLibrary(root);
    expect(courses.find((c) => c.title === "node_modules")).toBeUndefined();
  });

  it("skips hidden folders (anything starting with '.')", async () => {
    const courses = await scanLibrary(root);
    expect(courses.find((c) => c.title === ".cache")).toBeUndefined();
  });

  it("falls back to ordinal position when filename has no numeric prefix", async () => {
    const adhocRoot = join(tmpdir(), `lecturn-scanner-adhoc-${Date.now()}`);
    await mkdir(join(adhocRoot, "AdHoc"), { recursive: true });
    await touch(join(adhocRoot, "AdHoc", "no-prefix.mp4"));
    try {
      const [course] = await scanLibrary(adhocRoot);
      expect(course?.flatEpisodes[0]?.title).toBe("no-prefix");
      expect(course?.flatEpisodes[0]?.position).toBe(1);
    } finally {
      await rm(adhocRoot, { recursive: true, force: true });
    }
  });
});
