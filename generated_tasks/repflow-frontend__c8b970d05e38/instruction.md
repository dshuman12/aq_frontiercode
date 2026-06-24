# Task description

Improve user-facing error messaging in `lib/error-messages.ts` so that authentication and API fetch failures are explained in a friendly, accurate way. Two problems need attention:

1. Errors originating from JWK/Cognito token validation (for example messages mentioning JWK, Cognito, token signature, or expired/invalid tokens) currently surface as raw technical strings. These should be mapped to a clear, human-readable message that points the user toward re-authenticating, without leaking internal token details.

2. Generic `fetch`/network failures from API calls must not be blanket-labeled as "offline". A failed API request while the user is actually connected should be described as a temporary problem reaching the server, distinct from a true offline/no-connection state.

The contacts screen at `app/creator/contacts/page.tsx` should consume the improved mapping so its surfaced errors reflect the new behavior. Keep the existing exported function names and signatures stable so current callers continue to work. Do not alter unrelated error categories or change how successful responses are handled.

# Test guidelines

Run `npm test`. Add or extend cases in `lib/__tests__/error-messages.test.ts` to cover: JWK/Cognito/token-validation inputs mapping to the friendly re-auth message, generic fetch/network errors mapping to a server-reachability message rather than an offline label, and a genuine offline condition still producing the offline message. Confirm existing error categories remain unchanged and that the contacts page reflects the updated text.

# Lint guidelines

Run `npm run lint` and resolve any reported issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
