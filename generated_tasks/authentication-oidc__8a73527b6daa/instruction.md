# Task description

The `/user-info` endpoint in `src/handlers/user-info.ts` is **broken** — it is not correctly returning user credentials (loan account id, credit card account id, credit card id) based on the caller's scopes.

**Your task:** Identify and fix the bug in the user-info endpoint. The bug is likely in:
- How the endpoint fetches credentials from the banking service
- How it filters them based on scopes
- How it formats/returns the response

**Hint:** The end-to-end test in `src/test-e2e/other/user-info.test.ts` is failing. Run it to see what the endpoint is currently returning vs. what is expected. Fix the endpoint to return the correct shape and values.

Do not modify the banking service interfaces; only fix the user-info endpoint logic.

# Test guidelines

Run `npm run test-local-suite --suite=src/test-e2e/other/user-info.test.ts` to test the user-info endpoint. The test should pass once you fix the endpoint logic. Do not modify the tests themselves; the assertions are correct.

# Lint guidelines

Run `npm run lint` to check formatting and `npm run lint-fix` to apply Prettier in place. No lint warnings should remain.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Do not edit Terraform under `terraform/`, deployment workflows, or unrelated function handlers. Keep the change scoped to user-info, the banking service implementations, and their tests.
