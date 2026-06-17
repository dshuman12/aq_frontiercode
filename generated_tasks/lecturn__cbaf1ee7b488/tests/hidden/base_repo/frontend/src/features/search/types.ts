interface CourseHit {
  type: "course";
  id: string;
  libraryId: string;
  title: string;
  description: string | null;
  rank: number;
}

interface EpisodeHit {
  type: "episode";
  id: string;
  libraryId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  rank: number;
}

export type SearchHit = CourseHit | EpisodeHit;
