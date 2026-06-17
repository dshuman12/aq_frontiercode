import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EpisodeList } from "./EpisodeList";
import type { CourseChapter, CourseEpisode } from "~/features/courses/types";

function makeEp(overrides: Partial<CourseEpisode> = {}): CourseEpisode {
  return {
    id: overrides.id ?? "ep-1",
    title: overrides.title ?? "Episode",
    position: overrides.position ?? 1,
    durationSec: overrides.durationSec ?? 60,
    progressSec: overrides.progressSec ?? 0,
    completed: overrides.completed ?? false,
    transcodeStatus: overrides.transcodeStatus ?? "ready",
    transcodeProgress: overrides.transcodeProgress ?? 1,
    subtitles: overrides.subtitles ?? [],
  };
}

const oneChapterFixture: CourseChapter[] = [
  {
    id: "ch-1",
    title: "Solo",
    position: 1,
    episodes: [
      makeEp({ id: "a", title: "First" }),
      makeEp({ id: "b", title: "Second", completed: true }),
    ],
  },
];

const multiChapterFixture: CourseChapter[] = [
  {
    id: "ch-1",
    title: "Intro",
    position: 1,
    episodes: [makeEp({ id: "a", title: "Welcome" })],
  },
  {
    id: "ch-2",
    title: "Generics",
    position: 2,
    episodes: [makeEp({ id: "b", title: "Lesson" })],
  },
];

describe("EpisodeList", () => {
  it("renders every episode title", () => {
    render(
      <EpisodeList chapters={oneChapterFixture} activeId={null} onSelect={() => {}} />,
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("hides chapter headings when there's only one chapter", () => {
    render(
      <EpisodeList chapters={oneChapterFixture} activeId={null} onSelect={() => {}} />,
    );
    expect(screen.queryByText("Solo")).toBeNull();
  });

  it("shows chapter headings when there are multiple chapters", () => {
    render(
      <EpisodeList chapters={multiChapterFixture} activeId={null} onSelect={() => {}} />,
    );
    expect(screen.getByText("Intro")).toBeInTheDocument();
    expect(screen.getByText("Generics")).toBeInTheDocument();
  });

  it("calls onSelect with the clicked episode", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <EpisodeList chapters={oneChapterFixture} activeId={null} onSelect={onSelect} />,
    );
    await user.click(screen.getByText("Second"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b", completed: true }),
    );
  });

  it("renders the duration for each episode", () => {
    render(
      <EpisodeList chapters={oneChapterFixture} activeId={null} onSelect={() => {}} />,
    );
    // 60s -> '1m'
    expect(screen.getAllByText("1m")).toHaveLength(2);
  });

  it("highlights the active episode (different background class)", () => {
    render(
      <EpisodeList chapters={oneChapterFixture} activeId="a" onSelect={() => {}} />,
    );
    const buttons = screen.getAllByRole("button");
    const activeBtn = buttons.find((b) => b.textContent?.includes("First"))!;
    const inactiveBtn = buttons.find((b) => b.textContent?.includes("Second"))!;
    expect(activeBtn.className).toContain("bg-[var(--color-amber-accent)]/10");
    expect(inactiveBtn.className).not.toContain("bg-[var(--color-amber-accent)]/10");
  });
});
