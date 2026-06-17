import { CourseGrid } from "~/features/courses/components/CourseGrid";
import { WatchLaterRail } from "~/features/watch-later/WatchLaterRail";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Your shelf</h1>
        <p className="text-[var(--muted-foreground)]">
          Pick up where you left off, or sync your library to import new courses.
        </p>
      </header>
      <WatchLaterRail />
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">All courses</h2>
        <CourseGrid />
      </section>
    </div>
  );
}
