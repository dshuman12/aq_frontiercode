# Task description

Add a JSONL (newline-delimited JSON) importer at `src/importers/jsonl.ts` that can read, write, and validate pantry import records. JSONL files contain one JSON object per line, each describing an item to import.

Provide a reader that parses each non-empty line as a JSON object and produces an `ImportResult` consistent with the existing shape used by `receipt.ts` (`added: ImportedItem[]`, `skipped: number`, `warnings: string[]`). Reuse `ImportedItem`/`ImportResult` and the core helpers from `../item.js`, `../units.js`, and `../date.js` so validation rules match the receipt importer: skip records lacking both `item` and `slug`, require a parseable `qty`, validate `where` via `isValidLocation` (defaulting to `pantry`), and validate `best_by` with `isISODate`.

Each validation failure must produce a `warnings` entry referencing the offending line number, and malformed JSON on a line should be reported as a warning rather than throwing. Also export a writer that serializes `ImportedItem`s back to JSONL, round-tripping cleanly through the reader.

# Test guidelines

Tests run with `npm test`, which builds via `tsc` and executes compiled `*.test.js` files using Node's built-in test runner. Add `src/importers/jsonl.test.ts` covering: valid multi-record input, blank-line handling, records missing item/slug, bad quantities, invalid locations and best_by dates, malformed JSON lines, and a write-then-read round trip. Assert warning messages include the correct 1-based line numbers and that `skipped` counts match. Do not weaken the existing receipt importer tests.

# Lint guidelines

Run `npm run lint` (`tsc --noEmit`) and ensure it passes with no type errors. Keep `ImportResult` and `ImportedItem` contracts identical to `receipt.ts`; do not alter shared core modules or `csv-parser.ts`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Match the existing module conventions: ES module `.js` import specifiers, two-space indentation, and explicit exported types.
