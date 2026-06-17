import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Player } from "./Player";

// Vidstack is heavy and sets up DOM observers; mock it to a thin shell that
// just renders children. We're testing our overlay/branching logic, not
// Vidstack's internals.
vi.mock("@vidstack/react", () => ({
  MediaPlayer: ({ children, src }: { children: React.ReactNode; src: string }) => (
    <div data-testid="player" data-src={src}>
      {children}
    </div>
  ),
  MediaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Poster: () => null,
  Track: ({ src, language }: { src: string; language?: string }) => (
    <track data-testid="track" data-src={src} data-lang={language} />
  ),
}));

vi.mock("@vidstack/react/player/layouts/default", () => ({
  defaultLayoutIcons: {},
  DefaultVideoLayout: () => null,
}));

const baseProps = {
  episodeId: "ep-1",
  title: "Welcome",
  startAtSec: 0,
  subtitles: [],
};

describe("Player", () => {
  it("shows the queued overlay when status='pending'", () => {
    render(
      <Player
        {...baseProps}
        transcodeStatus="pending"
        transcodeProgress={0}
      />,
    );
    expect(screen.getByText(/Queued for transcoding/)).toBeInTheDocument();
  });

  it("shows the probing overlay when status='probing'", () => {
    render(
      <Player
        {...baseProps}
        transcodeStatus="probing"
        transcodeProgress={0}
      />,
    );
    expect(screen.getByText(/Inspecting source video/)).toBeInTheDocument();
  });

  it("shows transcoding progress with percent label", () => {
    render(
      <Player
        {...baseProps}
        transcodeStatus="transcoding"
        transcodeProgress={0.42}
      />,
    );
    expect(screen.getByText(/Transcoding · 42%/)).toBeInTheDocument();
  });

  it("shows the failed message when status='failed'", () => {
    render(
      <Player
        {...baseProps}
        transcodeStatus="failed"
        transcodeProgress={0}
      />,
    );
    expect(screen.getByText(/Transcoding failed/)).toBeInTheDocument();
  });

  it("renders the actual player with the HLS src when status='ready'", () => {
    render(
      <Player
        {...baseProps}
        transcodeStatus="ready"
        transcodeProgress={1}
      />,
    );
    const player = screen.getByTestId("player");
    expect(player.getAttribute("data-src")).toMatch(/hls\/master\.m3u8$/);
  });

  it("renders one Track per subtitle, defaulting language", () => {
    render(
      <Player
        {...baseProps}
        transcodeStatus="ready"
        transcodeProgress={1}
        subtitles={[
          { language: "en", label: "English", isDefault: true },
          { language: "und", label: "UND", isDefault: false },
        ]}
      />,
    );
    const tracks = screen.getAllByTestId("track");
    expect(tracks).toHaveLength(2);
    expect(tracks[0]?.getAttribute("data-lang")).toBe("en");
    // 'und' should be omitted as a language attribute (passed undefined).
    expect(tracks[1]?.getAttribute("data-lang")).toBeFalsy();
  });
});
