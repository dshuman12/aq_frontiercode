# Task description

Implement a small, dependency-free CSV reader in `src/importers/csv-parser.ts` that turns raw CSV text into structured rows for the pantry importers. The parser must correctly handle the common real-world quirks that break naive `split(',')` approaches:

- Quoted fields wrapped in double quotes, including fields that contain commas, newlines, and escaped quotes (a doubled `""` inside a quoted field decodes to a single `"`).
- A leading UTF-8 byte-order mark (BOM) on the first field, which must be stripped so the first header/value is not corrupted.
- Both `\n` and `\r\n` (CRLF) line endings, treated as equivalent record separators.

Export a parsing function that accepts the CSV string and returns an array of records, where each record is an array of string field values. Empty trailing newlines should not produce a spurious empty row, but a genuinely empty quoted field (`""`) must be preserved as an empty string. Unterminated quoted fields should fail clearly rather than silently truncating data.

Keep the contract consistent with how other modules under `src/importers` consume this function, and avoid changing unrelated core or CLI behavior.

# Test guidelines

Add or extend tests in `src/importers` (the `*.test.ts` files compile to `dist` and run via `node --test`). Cover quoted fields containing commas and embedded newlines, escaped `""` quotes, BOM stripping on the first field, mixed `\n` and `\r\n` separators, empty fields, and the unterminated-quote error case. Run `npm test` to build expectations against observable parser output rather than internal helpers.

# Lint guidelines

Run `npm run lint` (`tsc --noEmit`) and ensure it reports no type errors. The project uses ES modules and Node >= 20.16; do not add runtime dependencies or alter `package.json` scripts.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
