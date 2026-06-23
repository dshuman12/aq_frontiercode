# Task description

Resolve the job address handling in the job site API. Creating a job address should use the selected subdivision (`locationId`) as the source of customer/home-owner ownership, should no longer require callers to send a separate `customerId`, and should accept either map coordinates or a structured postal address as the address source. A create request must still require `name` and `locationId`, reject requests that provide neither coordinates nor address data, reject duplicate job address names within the same subdivision, create the `JobSite`, and push the new site id into the owning `JobLocation.jobSites` list.

Updating a job address should preserve existing fields when optional values are omitted, especially the saved address, coordinates, owner fields, and active flag. If the submitted name changes, reject it when another job address in the same subdivision already uses that name; otherwise update only the intended site and return the existing success/no-change style responses. Keep the existing get endpoint behavior for filtering by id, customer, homeowner, subdivision, and active status. Remove or disable the `/name` search route if it conflicts with the corrected job address flow.

# Test guidelines

The archived `npm test` script in this snapshot calls `nyc`, but `nyc` is not installed by the lockfile. For local validation, install dependencies with scripts disabled to avoid the old native `grpc` build, then run the relevant Mocha tests directly:

```sh
npm --cache .npm-cache install --legacy-peer-deps --ignore-scripts --no-audit --fund=false
./node_modules/.bin/mocha -r ts-node/register --recursive src/tests/controllers/jobSite.test.ts
```

Add or update controller tests under `src/tests/controllers/` for create and update regressions. Cover at least one address-only create, one missing-address rejection, one duplicate-name rejection scoped to a subdivision, and one update that omits optional address/location fields and preserves the previous values. Prefer stubbing the Mongoose models, as nearby controller tests do, rather than requiring a live database.

# Lint guidelines

Run `npm run tsc` if dependencies are installed. You may also run `npm run lint`, but expect the broader repository to contain existing style issues outside this task. Treat new lint or type failures in `src/controllers/jobSite.ts`, `src/routes/jobSite.ts`, and any job site controller tests as regressions to fix before submitting.

# Style guidelines

You are already on the correct starting snapshot. Keep the patch focused on the job site controller, job site route registration, and targeted job site tests. Avoid broad rewrites, generated output churn, package upgrades, or changes to unrelated service-ticket behavior unless they are strictly necessary for this job address fix. Preserve the existing Express controller response style and constants from `src/common/constants.ts` so callers see compatible status/message shapes.
