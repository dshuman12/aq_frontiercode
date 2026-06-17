import { api } from "~/lib/api-client";

export const playerApi = {
  saveProgress: (episodeId: string, positionSec: number, completed?: boolean) =>
    api.put<void>(`/progress/${episodeId}`, { positionSec, completed }),
};
