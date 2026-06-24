# Task description

Add a canonical-form table for unit abbreviations in `src/core/abbrev.ts`. The module should map the many ways people write a unit (in recipes, receipts, and CLI input) onto a single canonical unit token, so that downstream conversion and density lookups receive consistent values.

The table should cover common mass, volume, and count units along with their typical abbreviations and plural/spelled-out forms — for example `g`/`gram`/`grams`, `kg`/`kilogram`, `ml`/`milliliter`/`millilitre`, `l`/`litre`, `tsp`/`teaspoon`, `tbsp`/`tablespoon`, `cup`/`cups`, `oz`/`ounce`, `lb`/`pound`, and bare counts like `piece`/`pcs`. Matching must be case-insensitive and tolerate a trailing period (e.g. `Tbsp.`).

Expose helpers consistent with the other `src/core` lookup modules: a `canonical(unit)` that returns the canonical token (falling back to the trimmed, lowercased input when unknown), an `isKnown(unit)` predicate, and a `knownUnits()` returning the sorted canonical tokens. Keep return types plain strings/booleans and do not throw on unrecognized input.

# Test guidelines

Add or update tests in `src/core` (alongside files like `src/core/abbrev.test.ts`) using the built-in `node:test` runner. Cover canonicalization across abbreviations, plurals, mixed case, and trailing-period forms, the unknown-input passthrough, and that `knownUnits()` is sorted and deduplicated.

Run the suite with `npm test`. The runner executes compiled output, so run `npm run build` first (or rely on the validation workflow below).

# Lint guidelines

Run `npm run lint` (`tsc --noEmit`) and ensure it passes with no type errors. Keep the public surface limited to the documented exports; avoid introducing new dependencies.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Match the existing `src/core` conventions: a module-level `const` table, a `Map` built once for reverse lookups, and small pure exported functions. Validate end to end with `npm run build && npm test`.
