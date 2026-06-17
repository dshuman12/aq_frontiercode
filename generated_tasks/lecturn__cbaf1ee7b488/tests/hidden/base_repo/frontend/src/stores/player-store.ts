import { create } from "zustand";

interface PlayerState {
  episodeId: string | null;
  positionSec: number;
  setEpisode: (id: string) => void;
  setPosition: (s: number) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  episodeId: null,
  positionSec: 0,
  setEpisode: (episodeId) => set({ episodeId, positionSec: 0 }),
  setPosition: (positionSec) => set({ positionSec }),
  reset: () => set({ episodeId: null, positionSec: 0 }),
}));
