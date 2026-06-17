"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookmarksApi } from "./api";

const keys = {
  list: (episodeId: string) => ["bookmarks", episodeId] as const,
};

export function useBookmarks(episodeId: string | null) {
  return useQuery({
    queryKey: keys.list(episodeId ?? "_none"),
    queryFn: () => bookmarksApi.list(episodeId!),
    enabled: !!episodeId,
  });
}

export function useCreateBookmark(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { atSec: number; label?: string }) =>
      bookmarksApi.create(episodeId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(episodeId) }),
  });
}

export function useUpdateBookmark(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      bookmarkId: string;
      label?: string | null;
      atSec?: number;
    }) => {
      const { bookmarkId, ...patch } = input;
      return bookmarksApi.update(bookmarkId, patch);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(episodeId) }),
  });
}

export function useDeleteBookmark(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookmarkId: string) => bookmarksApi.remove(bookmarkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(episodeId) }),
  });
}
