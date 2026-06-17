export interface Note {
  id: string;
  episodeId: string;
  atSec: number | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Highlight {
  id: string;
  episodeId: string;
  startSec: number;
  endSec: number;
  text: string | null;
  color: string;
  note: string | null;
  createdAt: string;
}
