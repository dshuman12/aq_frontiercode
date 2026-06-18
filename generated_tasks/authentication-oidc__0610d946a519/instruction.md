# Task description

The `/user-info` endpoint returns user credentials derived from banking data, including date fields sourced from the core banking service. These date values are currently mishandled during transformation: the value produced by the banking layer is not converted into the type the response contract expects, leading to incorrect or malformed date output in the user-info payload.

Fix the date type transform so that date fields flowing from the banking service through `src/functions/other/userInfo/userInfo.ts` are correctly typed and serialized in the response. Align the transform with the shape declared in `src/services/banking/interface.ts`, ensuring the returned date is consistent with what downstream consumers expect (e.g. a properly formatted string rather than a raw or misinterpreted value).

Keep the endpoint's required-scope behavior and overall response structure unchanged; only the date field handling should change. Avoid touching unrelated services, auth flows, or Terraform configuration. The `date-fns` dependency is available if needed for formatting.

# Test guidelines

Run `npm test` to execute the unit suite. The e2e coverage for this endpoint lives in `src/test-e2e/other` (notably `user-info.test.ts`); extend or add cases there to assert that date fields are returned in the correct type and format, including edge cases like missing or boundary date values.

Add or update assertions alongside the existing `userInfo.test.ts` unit test so the transform is verified directly and protected against regressions. Do not weaken existing scope or response assertions.

# Lint guidelines

Run `npm run lint` to check formatting and `npm run lint-fix` to apply Prettier formatting in-place before finishing. No files should remain unformatted.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
