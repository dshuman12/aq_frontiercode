"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "~/lib/utils";

interface Props {
  // HTML produced by Tiptap's serializer. Plain-markdown notes still render — Tiptap wraps them in <p>.
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const TOOLBAR = [
  { cmd: "toggleBold", icon: Bold, label: "Bold" },
  { cmd: "toggleItalic", icon: Italic, label: "Italic" },
  { cmd: "toggleHeading", icon: Heading2, label: "Heading", level: 2 },
  { cmd: "toggleBulletList", icon: List, label: "Bullet list" },
  { cmd: "toggleOrderedList", icon: ListOrdered, label: "Numbered list" },
  { cmd: "toggleBlockquote", icon: Quote, label: "Blockquote" },
  { cmd: "toggleCode", icon: Code, label: "Inline code" },
] as const;

export function RichEditor({ value, onChange, placeholder, autoFocus }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2",
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Only setContent on a real diff so an active selection isn't blown away on every onChange.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]">
      <div className="flex items-center gap-0.5 border-b border-[var(--border)] px-2 py-1">
        {TOOLBAR.map((t) => {
          const Icon = t.icon;
          const isActive =
            "level" in t
              ? editor.isActive("heading", { level: t.level })
              : editor.isActive(t.cmd.replace("toggle", "").toLowerCase());
          return (
            <button
              key={t.cmd}
              type="button"
              aria-label={t.label}
              onClick={() => {
                // Tiptap chains are dynamically typed; cast through unknown to index by string literal.
                const chain = editor.chain().focus() as unknown as Record<
                  string,
                  (...args: unknown[]) => { run: () => void }
                >;
                if ("level" in t) {
                  chain[t.cmd]?.({ level: t.level }).run();
                } else {
                  chain[t.cmd]?.().run();
                }
              }}
              className={cn(
                "rounded p-1.5 transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]",
                isActive && "text-[var(--foreground)] bg-[var(--muted)]",
              )}
            >
              <Icon className="size-3.5" />
            </button>
          );
        })}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

// Trusted because notes are per-user and only the owner can write them.
export function RichBody({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn("prose prose-sm max-w-none", className)}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
