export interface QueueItem {
  episodeId: string;
  episodeTitle: string;
  episodeDurationSec: number;
  positionSec: number;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  libraryId: string;
  addedAt: string | null;
  position: number | null;
  source: "queued" | "in_progress";
}

export interface QueueResponse {
  queued: QueueItem[];
  continueWatching: QueueItem[];
}
