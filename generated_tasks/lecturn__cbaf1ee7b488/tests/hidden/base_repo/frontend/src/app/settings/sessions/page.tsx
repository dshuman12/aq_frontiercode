"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, Monitor } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardBody, CardMeta, CardTitle } from "~/components/ui/card";
import { authClient, useSession } from "~/lib/auth-client";

type Sess = {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  expiresAt: string;
};

function timeAgo(date: string) {
  const ms = Date.now() - new Date(date).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function SessionsPage() {
  const qc = useQueryClient();
  const { data: current } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await authClient.listSessions();
      return (res.data ?? []) as unknown as Sess[];
    },
  });

  const revoke = useMutation({
    mutationFn: (token: string) => authClient.revokeSession({ token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const revokeOthers = useMutation({
    mutationFn: () => authClient.revokeOtherSessions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const currentToken = current?.session?.token;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-semibold">Sessions</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Devices currently signed into your account.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => revokeOthers.mutate()}
          disabled={revokeOthers.isPending || (data?.length ?? 0) <= 1}
        >
          {revokeOthers.isPending && <Loader2 className="size-4 animate-spin" />}
          Sign out other devices
        </Button>
      </header>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-[var(--muted-foreground)]" />
        </div>
      )}

      <div className="space-y-3">
        {(data ?? []).map((s) => {
          const isCurrent = s.token === currentToken;
          return (
            <Card key={s.id}>
              <CardBody className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="grid size-9 place-items-center rounded-md bg-[var(--muted)] shrink-0">
                    <Monitor className="size-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <CardTitle className="text-base flex items-center gap-2">
                      {s.userAgent || "Unknown device"}
                      {isCurrent && (
                        <span className="rounded-full bg-[var(--color-amber-accent)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--color-amber-accent)]">
                          This device
                        </span>
                      )}
                    </CardTitle>
                    <CardMeta className="truncate">
                      {s.ipAddress || "no ip"} · created {timeAgo(s.createdAt)}
                    </CardMeta>
                  </div>
                </div>
                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke.mutate(s.token)}
                    disabled={revoke.isPending}
                  >
                    <LogOut className="size-4" /> Revoke
                  </Button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
