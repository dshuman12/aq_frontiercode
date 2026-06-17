import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export type ScannedSubtitle = {
  language: string;
  label: string;
  format: "srt" | "vtt";
  filePath: string;
};

export type ScannedEpisode = {
  title: string;
  position: number;
  filePath: string;
  fileSizeBytes: number;
  subtitles: ScannedSubtitle[];
};

export type ScannedChapter = {
  title: string;
  position: number;
  episodes: ScannedEpisode[];
};

export type ScannedCourse = {
  title: string;
  sourcePath: string;
  chapters: ScannedChapter[];
  flatEpisodes: ScannedEpisode[];
};

const VIDEO_EXT = ".mp4";
const SUBTITLE_EXTS = [".vtt", ".srt"] as const;

// Skip dev/build folders so a misconfigured LIBRARY_ROOT (e.g. ~/Development) doesn't try to import them.
const SKIP_FOLDERS = new Set([
  ".git",
  ".github",
  ".vscode",
  ".idea",
  ".next",
  ".turbo",
  ".cache",
  "node_modules",
  "dist",
  "build",
  "target",
  "vendor",
  "venv",
  ".venv",
  "__pycache__",
  "coverage",
  ".pytest_cache",
  ".gradle",
  ".cargo",
  ".npm",
  ".yarn",
  ".pnpm-store",
  ".DS_Store",
]);

function isCandidate(folder: string): boolean {
  if (folder.startsWith(".")) return false;
  return !SKIP_FOLDERS.has(folder.toLowerCase());
}

const NUM_PREFIX = /^(\d+)[\s._-]+(.+)$/;

// BCP-47-ish suffix on a basename, e.g. `01_Welcome.en` or `01_Welcome.fr-FR`. Anything else falls back to "und".
const LANG_TAG = /\.([a-z]{2,3}(?:-[A-Z]{2})?)$/;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  "en-US": "English (US)",
  "en-GB": "English (UK)",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  hi: "Hindi",
  ar: "Arabic",
};

function parseNumeric(name: string, fallback: number): { position: number; title: string } {
  const match = NUM_PREFIX.exec(name);
  if (!match) return { position: fallback, title: name };
  return { position: Number(match[1]), title: match[2] ?? name };
}

function stripExt(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

async function listDirs(path: string, filterCandidates = false) {
  const entries = await readdir(path, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => !filterCandidates || isCandidate(n))
    .sort();
}

interface DirIndex {
  videos: string[];
  // Indexed by extension-less video basename so episode scanning can attach subtitles in O(1).
  subtitlesByBase: Map<string, ScannedSubtitle[]>;
}

async function indexDir(path: string): Promise<DirIndex> {
  const entries = await readdir(path, { withFileTypes: true });
  const videos: string[] = [];
  const subtitlesByBase = new Map<string, ScannedSubtitle[]>();

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const lower = entry.name.toLowerCase();
    if (lower.endsWith(VIDEO_EXT)) {
      videos.push(entry.name);
      continue;
    }
    const subExt = SUBTITLE_EXTS.find((ext) => lower.endsWith(ext));
    if (!subExt) continue;

    // "01_Welcome.en.vtt" -> base "01_Welcome", language "en"; "01_Welcome.vtt" -> language "und".
    const noExt = entry.name.slice(0, -subExt.length);
    const langMatch = LANG_TAG.exec(noExt);
    const base = langMatch ? noExt.slice(0, langMatch.index) : noExt;
    const language = langMatch?.[1] ?? "und";
    const label = LANGUAGE_NAMES[language] ?? language.toUpperCase();

    const list = subtitlesByBase.get(base) ?? [];
    list.push({
      language,
      label,
      format: subExt === ".vtt" ? "vtt" : "srt",
      filePath: join(path, entry.name),
    });
    subtitlesByBase.set(base, list);
  }

  videos.sort();
  return { videos, subtitlesByBase };
}

async function scanEpisodes(dir: string): Promise<ScannedEpisode[]> {
  const index = await indexDir(dir);
  return Promise.all(
    index.videos.map(async (file, idx) => {
      const full = join(dir, file);
      const s = await stat(full);
      const baseName = stripExt(file);
      const { position, title } = parseNumeric(baseName, idx + 1);
      const subtitles = index.subtitlesByBase.get(baseName) ?? [];
      return {
        title,
        position,
        filePath: full,
        fileSizeBytes: s.size,
        subtitles,
      };
    }),
  );
}

export async function scanLibrary(root: string): Promise<ScannedCourse[]> {
  const courseFolders = await listDirs(root, true);
  const out: ScannedCourse[] = [];

  for (const folder of courseFolders) {
    const coursePath = join(root, folder);
    const chapterFolders = await listDirs(coursePath, true);

    let course: ScannedCourse;
    if (chapterFolders.length > 0) {
      const chapters = await Promise.all(
        chapterFolders.map(async (ch, i) => {
          const { position, title } = parseNumeric(ch, i + 1);
          const episodes = await scanEpisodes(join(coursePath, ch));
          return { title, position, episodes } satisfies ScannedChapter;
        }),
      );
      course = { title: folder, sourcePath: coursePath, chapters, flatEpisodes: [] };
    } else {
      const flatEpisodes = await scanEpisodes(coursePath);
      course = { title: folder, sourcePath: coursePath, chapters: [], flatEpisodes };
    }

    const totalEpisodes =
      course.flatEpisodes.length +
      course.chapters.reduce((acc, ch) => acc + ch.episodes.length, 0);
    if (totalEpisodes > 0) out.push(course);
  }

  return out;
}
