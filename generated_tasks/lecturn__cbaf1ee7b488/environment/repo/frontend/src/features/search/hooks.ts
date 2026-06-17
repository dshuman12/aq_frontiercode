"use client";

import { useQuery } from "@tanstack/react-query";
import { searchApi } from "./api";

// Callers debounce — SearchPalette flushes keystrokes into this hook every ~150ms.
export function useSearch(query: string, limit?: number) {
  return useQuery({
    queryKey: ["search", query, limit],
    queryFn: () => searchApi.search(query, limit),
    enabled: query.trim().length > 0,
    staleTime: 30_000,
  });
}
