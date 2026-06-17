"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { highlightsApi, notesApi } from "./api";

const noteKeys = {
  list: (episodeId: string) => ["notes", episodeId] as const,
};
const highlightKeys = {
  list: (episodeId: string) => ["highlights", episodeId] as const,
};

export function useNotes(episodeId: string | null) {
  return useQuery({
    queryKey: noteKeys.list(episodeId ?? "_none"),
    queryFn: () => notesApi.list(episodeId!),
    enabled: !!episodeId,
  });
}

export function useCreateNote(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { body: string; atSec?: number | null }) =>
      notesApi.create(episodeId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.list(episodeId) }),
  });
}

export function useUpdateNote(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      noteId: string;
      body?: string;
      atSec?: number | null;
    }) => {
      const { noteId, ...patch } = input;
      return notesApi.update(noteId, patch);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.list(episodeId) }),
  });
}

export function useDeleteNote(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => notesApi.remove(noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.list(episodeId) }),
  });
}

export function useHighlights(episodeId: string | null) {
  return useQuery({
    queryKey: highlightKeys.list(episodeId ?? "_none"),
    queryFn: () => highlightsApi.list(episodeId!),
    enabled: !!episodeId,
  });
}

export function useCreateHighlight(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      startSec: number;
      endSec: number;
      text?: string | null;
      color?: string;
      note?: string | null;
    }) => highlightsApi.create(episodeId, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: highlightKeys.list(episodeId) }),
  });
}

export function useDeleteHighlight(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (highlightId: string) => highlightsApi.remove(highlightId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: highlightKeys.list(episodeId) }),
  });
}
