"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card, CardBody, CardMeta, CardTitle } from "~/components/ui/card";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function ping() {
  const res = await fetch(`${BASE}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { status: string; service: string };
}

export function ApiStatus() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["api-health"],
    queryFn: ping,
    refetchInterval: 15_000,
    retry: false,
  });

  return (
    <Card>
      <CardBody className="flex items-start gap-3">
        <div className="pt-1">
          {isLoading ? (
            <Loader2 className="size-5 animate-spin text-[var(--muted-foreground)]" />
          ) : isError ? (
            <XCircle className="size-5 text-red-500" />
          ) : (
            <CheckCircle2 className="size-5 text-[var(--color-amber-accent)]" />
          )}
        </div>
        <div className="space-y-0.5">
          <CardTitle className="text-base">
            {isLoading ? "Checking…" : isError ? "API unreachable" : "API online"}
          </CardTitle>
          <CardMeta>
            {isError
              ? error instanceof Error
                ? error.message
                : "Unknown error"
              : data
              ? `${data.service} reports ${data.status}`
              : "Pinging…"}
          </CardMeta>
        </div>
      </CardBody>
    </Card>
  );
}
