import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function NotFound() {
  return (
    <div className="py-24 text-center space-y-6">
      <div className="space-y-2">
        <p className="font-display text-7xl font-semibold tracking-tight text-[var(--color-amber-accent)]">
          404
        </p>
        <h1 className="font-display text-3xl font-semibold">Off the syllabus</h1>
        <p className="text-[var(--muted-foreground)] max-w-md mx-auto">
          That page isn&apos;t in the curriculum. It may have been moved or never existed.
        </p>
      </div>
      <Button asChild variant="accent">
        <Link href="/">Back to shelf</Link>
      </Button>
    </div>
  );
}
