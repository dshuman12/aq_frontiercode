# Task description

The `/user-info` endpoint returns user credentials (such as loan account ID, credit card account ID, and credit card ID) based on the caller's `onmouuid` and the scopes present on their access token. The end-to-end coverage for this endpoint in `src/test-e2e/other/user-info.test.ts` is currently failing because the behavior of the banking service no longer matches what the tests expect.

Investigate the banking integration in `src/services/banking/interface.ts` (and its implementation as needed) and bring the `/user-info` flow back to correct, consistent behavior. The endpoint should resolve credentials only for the scopes actually granted on the token, omit fields the caller is not entitled to, and handle users with missing or partial banking records without throwing.

Keep the public shape of the response stable for already-passing scope combinations, and do not change unrelated auth flows, scope mappings, or other service interfaces. Focus changes on the banking interface contract and any adjustments required for `userInfo` to consume it correctly.

# Test guidelines

Run `npm test` to execute the unit suites under `src/functions`. The relevant end-to-end checks live in `src/test-e2e/other`, with `user-info.test.ts` exercising the scope-to-credential resolution, including single-scope, multi-scope, and absent-record cases.

Add or update tests when behavior changes so each credential field maps to the correct scope and missing data degrades gracefully rather than erroring. Tests require the staging environment variables described in the README to be present.

# Lint guidelines

Run `npm run lint` to verify formatting via Prettier, and `npm run lint-fix` to apply fixes in place. Leave no formatting diffs in committed files.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
