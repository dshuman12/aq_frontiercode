"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flashcardsApi } from "./api";
import type { CardRating } from "./types";

const keys = {
  all: ["flashcards"] as const,
  filter: (p: { episodeId?: string; courseId?: string }) =>
    ["flashcards", p.episodeId ?? "_", p.courseId ?? "_"] as const,
  due: ["flashcards", "due"] as const,
};

export function useFlashcards(filter: { episodeId?: string; courseId?: string } = {}) {
  return useQuery({
    queryKey: keys.filter(filter),
    queryFn: () => flashcardsApi.list(filter),
  });
}

export function useDueFlashcards(limit?: number) {
  return useQuery({
    queryKey: keys.due,
    queryFn: () => flashcardsApi.due(limit),
  });
}

export function useCreateFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: flashcardsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { cardId: string; front?: string; back?: string }) => {
      const { cardId, ...patch } = input;
      return flashcardsApi.update(cardId, patch);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: flashcardsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useReviewFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { cardId: string; rating: CardRating }) =>
      flashcardsApi.review(input.cardId, input.rating),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.due });
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}
