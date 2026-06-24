# design notes

Why is it like this?

## why JSON files instead of sqlite

The first attempt used sqlite-ish (better-sqlite3) for a couple of
weeks. Rip-out reasons:
1. Locking on Sunday mornings: the home-server cron job and my laptop
   would race for the file lock. Rare crashes, but enough to be annoying.
2. `rsync` of a sqlite file mid-write is risky. With per-item JSON files,
   even an interrupted copy is just a slightly smaller library.

The cost is that `pantry list` re-reads every file. For my dataset
(~150 items, a few hundred lots) this is well under 100 ms; I don't care.

## why no external runtime deps

All runtime code is `node:*` stdlib only. devDependencies are TypeScript
+ @types/node, both pinned exactly. The Docker image has no
`npm install` step at runtime - the compiled `.js` ships as-is.

The downside: I had to re-implement a tiny CSV parser, a flag parser,
and a tiny ANSI-color helper. Each is small and well-tested.

## why the dispatch registry

Subcommand modules call `register()` from import side-effects, and
`main.ts` imports them with `import "./cli/commands/foo.js"`. This means
adding a subcommand is one new file plus one import line in main - no
central dispatch table to keep in sync.

The downside is that test isolation needs `dispatch.reset()`.

## why two distinct stores (items + recipes)

Recipes are slow-changing - I edit one once, then leave it for months.
Items churn weekly. Splitting them keeps the items directory uncluttered
and lets recipe edits use a different lifecycle (eg. eventually `git`-
versioning the recipe directory by itself).

## why hundreds of slugs hard-coded in `categories.ts`

Auto-categorization from a free-form name is unreliable. A small static
table of "canonical slugs" gives `pantry add "Olive Oil"` a way to
correctly land in `oils` without LLM-style guessing.

## things I'd revisit

- The CSV parser doesn't support multiline quoted fields. Real-world
  receipts can have those.
- The HTML view is server-rendered with no JS. A tiny client-side filter
  would be nicer.
- I want a `pantry plan` editor instead of editing `plan.json` by hand.
