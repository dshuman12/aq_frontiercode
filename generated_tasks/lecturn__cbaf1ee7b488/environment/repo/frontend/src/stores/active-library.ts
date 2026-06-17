"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Persisted to localStorage so the app reopens on the last-used library.
type State = {
  activeLibraryId: string | null;
  setActiveLibrary: (id: string | null) => void;
};

export const useActiveLibrary = create<State>()(
  persist(
    (set) => ({
      activeLibraryId: null,
      setActiveLibrary: (id) => set({ activeLibraryId: id }),
    }),
    { name: "lecturn:active-library" },
  ),
);
