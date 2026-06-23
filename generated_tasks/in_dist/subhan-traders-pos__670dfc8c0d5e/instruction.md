# Task description

The customer list currently fetches one small, unstructured batch from `/api/customers` and renders it through the offline-data helper. This becomes unusable for larger customer sets and makes search/filter behavior fragile. Rework the customer listing flow so the API and UI support stable incremental loading with search and outstanding-balance filtering.

In `src/app/api/customers/route.ts`, keep returning only active customers, but accept a trimmed `q` search term, an optional cursor, and an `outstanding=true` filter. Search should match name, phone, or CNIC case-insensitively, filter outstanding customers by positive outstanding amount, order results consistently by customer name, and return a paginated object containing the page data, the next cursor when more rows are available, and a total count that is not reduced by the cursor.

In `src/components/customers/CustomersClient.tsx`, replace the one-shot list fetch with a client-side infinite-scroll workflow. The first load and every search/filter change should reset the list, fetch the first page, and show loading/empty states. Scrolling to the sentinel should fetch the next page once, append it without duplicating rows, and stop when the API reports no next cursor. Preserve the existing customer actions, delete/deactivate behavior, online/offline visual state, and number formatting.

If you add or expose a MongoDB migration helper, keep it isolated under `src/db/seeds` and avoid changing unrelated POS, inventory, or order workflows.

# Test guidelines

The package does not define an `npm test` script, so do not rely on `npm test` for validation. Run `npm install` if dependencies are missing, then run `npm run lint -- src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx` as the focused visible regression check. Use `npm run build` as a stronger local check when a database URL is available, but do not change application behavior merely to satisfy a missing local database.

Add focused tests only if you can integrate them into the existing project workflow without introducing a new test framework. Useful coverage would exercise the customer API query contract, cursor handling, outstanding-only filtering, and the client reset/append behavior around search and infinite scroll.

# Lint guidelines

Run `npm run lint -- src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx` before submitting. Keep TypeScript types explicit around the API response shape and avoid `any` unless it is already forced by the nearby Drizzle query construction. Do not introduce new dependencies for basic pagination, search, or scroll observation; the repository already has React, Next, lucide-react, and use-debounce available.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Keep the change focused on `src/app/api/customers/route.ts`, `src/components/customers/CustomersClient.tsx`, `package.json` only if a real script is added, and optional seed utilities under `src/db/seeds`. Match the existing component style, toast usage, table layout, and translation patterns. Avoid broad rewrites of the offline store, order/customer detail pages, schema definitions, or generated migration output.
