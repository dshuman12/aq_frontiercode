"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { librariesApi, libraryApi } from "./api";

const keys = {
  all: ["libraries"] as const,
  shares: (id: string) => ["libraries", id, "shares"] as const,
};

export function useLibraries() {
  return useQuery({ queryKey: keys.all, queryFn: librariesApi.list });
}

export function useCreateLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: librariesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateLibrary(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; sourcePath?: string }) =>
      librariesApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: librariesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useLeaveLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: librariesApi.leave,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useShares(libraryId: string, enabled = true) {
  return useQuery({
    queryKey: keys.shares(libraryId),
    queryFn: () => librariesApi.shares(libraryId),
    enabled: enabled && !!libraryId,
  });
}

export function useInvite(libraryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; role: "viewer" | "editor" }) =>
      librariesApi.invite(libraryId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.shares(libraryId) }),
  });
}

export function useUpdateShare(libraryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { shareId: string; role: "viewer" | "editor" }) =>
      librariesApi.updateShare(libraryId, input.shareId, input.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.shares(libraryId) }),
  });
}

export function useRevokeShare(libraryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => librariesApi.revokeShare(libraryId, shareId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.shares(libraryId) }),
  });
}

export function useSyncLibrary(libraryId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!libraryId) throw new Error("No active library");
      return libraryApi.sync(libraryId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}
