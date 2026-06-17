"use client";

import { useEffect } from "react";
import { Button } from "~/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-24 text-center space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold">Something broke</h1>
        <p className="text-(--muted-foreground) max-w-md mx-auto">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
      </div>
      <Button onClick={reset} variant="accent">
        Try again
      </Button>
    </div>
  );
}
