"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { watchLaterApi } from "./api";

const keys = { queue: ["queue"] as const };

export function useQueue() {
  return useQuery({ queryKey: keys.queue, queryFn: watchLaterApi.get });
}

export function useAddToQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (episodeId: string) => watchLaterApi.add(episodeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue }),
  });
}

export function useRemoveFromQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (episodeId: string) => watchLaterApi.remove(episodeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue }),
  });
}

export function useReorderQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (episodeIds: string[]) => watchLaterApi.reorder(episodeIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue }),
  });
}
