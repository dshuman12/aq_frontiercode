"use client";

import { Loader2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  useInvite,
  useRevokeShare,
  useShares,
  useUpdateShare,
} from "~/features/libraries/hooks";

type Role = "viewer" | "editor";

export function LibraryShares({ libraryId }: { libraryId: string }) {
  const { data: shares, isLoading } = useShares(libraryId);
  const invite = useInvite(libraryId);
  const update = useUpdateShare(libraryId);
  const revoke = useRevokeShare(libraryId);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [err, setErr] = useState<string | null>(null);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await invite.mutateAsync({ email, role });
      setEmail("");
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Invite failed");
    }
  }

  return (
    <div className="rounded-md border border-[var(--border)] p-4 space-y-4">
      <h4 className="text-sm font-medium">Collaborators</h4>

      <form onSubmit={onInvite} className="grid gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor={`email-${libraryId}`} className="text-xs">
            Invite by email
          </Label>
          <Input
            id={`email-${libraryId}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`role-${libraryId}`} className="text-xs">
            Role
          </Label>
          <select
            id={`role-${libraryId}`}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
        </div>
        <Button type="submit" size="md" variant="default" disabled={invite.isPending}>
          {invite.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          Invite
        </Button>
      </form>

      {err && <p className="text-sm text-red-500">{err}</p>}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : (shares ?? []).length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No collaborators yet.</p>
      ) : (
        <ul className="space-y-2">
          {shares?.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-md bg-[var(--muted)]/40 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{s.name}</div>
                <div className="truncate text-xs text-[var(--muted-foreground)]">{s.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={s.role}
                  onChange={(e) =>
                    update.mutate({ shareId: s.id, role: e.target.value as Role })
                  }
                  className="h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revoke.mutate(s.id)}
                  disabled={revoke.isPending}
                  aria-label="Revoke"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
