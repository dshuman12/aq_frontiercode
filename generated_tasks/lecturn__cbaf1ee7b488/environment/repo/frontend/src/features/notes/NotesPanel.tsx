"use client";

import { Loader2, NotebookPen, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { RichBody, RichEditor } from "~/components/ui/rich-editor";
import { formatTimestamp } from "~/lib/format-time";
import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from "./hooks";
import type { Note } from "./types";

interface Props {
  episodeId: string;
  currentTime: number;
  onSeek?: (atSec: number) => void;
}

const EMPTY_HTML = "<p></p>";

function isEmpty(html: string): boolean {
  // Tiptap stringifies an empty editor as "<p></p>"; collapse other whitespace-only bodies too.
  const stripped = html.replace(/<[^>]*>/g, "").replace(/\s|&nbsp;/g, "");
  return stripped.length === 0;
}

export function NotesPanel({ episodeId, currentTime, onSeek }: Props) {
  const { data, isLoading } = useNotes(episodeId);
  const create = useCreateNote(episodeId);
  const remove = useDeleteNote(episodeId);
  const [draft, setDraft] = useState(EMPTY_HTML);
  const [anchor, setAnchor] = useState(true);

  useEffect(() => {
    setDraft(EMPTY_HTML);
  }, [episodeId]);

  async function onSave() {
    if (isEmpty(draft)) return;
    await create.mutateAsync({
      body: draft,
      atSec: anchor ? Math.max(0, Math.floor(currentTime)) : null,
    });
    setDraft(EMPTY_HTML);
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Notes
        </h3>
        <span className="text-xs text-[var(--muted-foreground)]">
          {data?.length ?? 0}
        </span>
      </header>

      <div className="space-y-2">
        <RichEditor
          value={draft}
          onChange={setDraft}
          placeholder="Type a note — bold, italics, lists, code, blockquote."
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <input
              type="checkbox"
              checked={anchor}
              onChange={(e) => setAnchor(e.target.checked)}
            />
            Anchor at {formatTimestamp(currentTime)}
          </label>
          <Button
            type="button"
            size="sm"
            variant="accent"
            onClick={onSave}
            disabled={create.isPending || isEmpty(draft)}
          >
            {create.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <NotebookPen className="size-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-4 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : data && data.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)] py-4 text-center">
          No notes yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {data?.map((n) => (
            <NoteRow
              key={n.id}
              note={n}
              episodeId={episodeId}
              onSeek={onSeek}
              onDelete={() => remove.mutate(n.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteRow({
  note,
  episodeId,
  onSeek,
  onDelete,
}: {
  note: Note;
  episodeId: string;
  onSeek?: (atSec: number) => void;
  onDelete: () => void;
}) {
  const update = useUpdateNote(episodeId);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  useEffect(() => setBody(note.body), [note.body]);

  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        {note.atSec !== null ? (
          <button
            type="button"
            onClick={() => onSeek?.(note.atSec!)}
            className="font-mono tabular-nums hover:text-[var(--color-amber-accent)] transition-colors"
          >
            {formatTimestamp(note.atSec)}
          </button>
        ) : (
          <span>unanchored</span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="hover:text-[var(--foreground)] transition-colors"
            aria-label="Edit note"
          >
            <NotebookPen className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="hover:text-red-500 transition-colors"
            aria-label="Delete note"
          >
            <Trash2 className="size-3.5" />
          </button>
        </span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <RichEditor value={body} onChange={setBody} autoFocus />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="accent"
              disabled={update.isPending}
              onClick={async () => {
                await update.mutateAsync({ noteId: note.id, body });
                setEditing(false);
              }}
            >
              <Save className="size-3.5" /> Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setBody(note.body);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <RichBody html={note.body} />
      )}
    </li>
  );
}
