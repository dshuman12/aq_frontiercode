"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardBody, CardMeta, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  useCreateLibrary,
  useDeleteLibrary,
  useLeaveLibrary,
  useLibraries,
} from "~/features/libraries/hooks";
import { useActiveLibrary } from "~/stores/active-library";
import { LibraryShares } from "./shares";

export default function LibrariesSettingsPage() {
  const { data: libraries, isLoading } = useLibraries();
  const create = useCreateLibrary();
  const del = useDeleteLibrary();
  const leave = useLeaveLibrary();
  const setActive = useActiveLibrary((s) => s.setActiveLibrary);

  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(null);
    try {
      const res = await create.mutateAsync({ name, sourcePath: path });
      setName("");
      setPath("");
      setActive(res.id);
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : "Failed to create");
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h2 className="font-display text-2xl font-semibold">Libraries</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Each library points at a folder of course videos. Share with collaborators
          to give them read or edit access.
        </p>
      </header>

      <Card>
        <CardBody>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-1">
              <CardTitle className="text-base">New library</CardTitle>
              <CardMeta>Add another folder of courses to your account.</CardMeta>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lib-name">Name</Label>
              <Input
                id="lib-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Frontend masters"
                required
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lib-path">Library root</Label>
              <Input
                id="lib-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/Users/me/courses"
                required
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Absolute path to the folder containing one subfolder per course.
              </p>
            </div>
            {createErr && <p className="text-sm text-red-500">{createErr}</p>}
            <Button type="submit" variant="accent" disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create library
            </Button>
          </form>
        </CardBody>
      </Card>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold">Your libraries</h3>
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        )}
        {(libraries ?? []).map((lib) => (
          <Card key={lib.id}>
            <CardBody className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base">{lib.name}</CardTitle>
                  <CardMeta className="font-mono text-xs break-all">{lib.sourcePath}</CardMeta>
                  <CardMeta>
                    {lib.role === "owner" ? "Owned by you" : `Shared by ${lib.ownerName} as ${lib.role}`}
                  </CardMeta>
                </div>
                {lib.role === "owner" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!confirm(`Delete "${lib.name}"? This removes all course rows.`)) return;
                      del.mutate(lib.id);
                    }}
                    disabled={del.isPending}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => leave.mutate(lib.id)}
                    disabled={leave.isPending}
                  >
                    Leave
                  </Button>
                )}
              </div>
              {lib.role === "owner" && <LibraryShares libraryId={lib.id} />}
            </CardBody>
          </Card>
        ))}
      </section>
    </div>
  );
}
