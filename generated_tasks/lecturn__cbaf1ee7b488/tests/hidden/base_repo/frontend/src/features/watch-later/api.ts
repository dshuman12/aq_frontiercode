import { api } from "~/lib/api-client";
import type { QueueResponse } from "./types";

export const watchLaterApi = {
  get: () => api.get<QueueResponse>("/queue"),
  add: (episodeId: string) =>
    api.post<{ ok: true }>(`/queue/${episodeId}`),
  remove: (episodeId: string) => api.del<void>(`/queue/${episodeId}`),
  reorder: (episodeIds: string[]) =>
    api.put<{ ok: true }>("/queue/order", { episodeIds }),
};
