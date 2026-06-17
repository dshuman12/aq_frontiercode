import { afterEach, describe, expect, it } from "vitest";
import { usePlayerStore } from "./player-store";

afterEach(() => {
  usePlayerStore.getState().reset();
});

describe("usePlayerStore", () => {
  it("starts with episodeId=null and positionSec=0", () => {
    expect(usePlayerStore.getState().episodeId).toBeNull();
    expect(usePlayerStore.getState().positionSec).toBe(0);
  });

  it("setEpisode sets the id and resets positionSec", () => {
    usePlayerStore.getState().setPosition(42);
    usePlayerStore.getState().setEpisode("ep-1");
    const s = usePlayerStore.getState();
    expect(s.episodeId).toBe("ep-1");
    expect(s.positionSec).toBe(0);
  });

  it("setPosition updates positionSec without changing episodeId", () => {
    usePlayerStore.getState().setEpisode("ep-7");
    usePlayerStore.getState().setPosition(99);
    expect(usePlayerStore.getState().episodeId).toBe("ep-7");
    expect(usePlayerStore.getState().positionSec).toBe(99);
  });

  it("reset clears both fields", () => {
    usePlayerStore.getState().setEpisode("ep");
    usePlayerStore.getState().setPosition(5);
    usePlayerStore.getState().reset();
    expect(usePlayerStore.getState().episodeId).toBeNull();
    expect(usePlayerStore.getState().positionSec).toBe(0);
  });
});
