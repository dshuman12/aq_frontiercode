# Task description

Improve the test coverage around the deposit verification pipeline and the bulk-deposit request contract. The `BulkDepositDto` in `src/web-api/deposit/bulk-deposit.dto.ts` defines the payload accepted by the bulk-deposit flow (`declaredTotal`, `paymentMethod`, `verificationMethod`, and a `receipts` array where each entry carries `amount`, optional `rawProof`, and optional `telegramFileId`). Its validation rules must stay aligned with how `DepositWebService.submitBulkDeposit` consumes them, and `tsconfig.json` settings should remain compatible with the existing build.

Strengthen unit tests so the validation pipes under `src/verification/common/validation-pipes` and the transaction repository under `src/transactions` exercise their meaningful branches: amount tolerance and unreadable amounts, duplicate transactions across blocked deposit statuses, receiver account/name normalization and mismatches, future and expired timestamps, and retry/funded handling in `createDepositRequest`.

Keep existing public behavior, reason codes (`AMOUNT_MISMATCH`, `DUPLICATE_TRANSACTION`, `RECEIVER_ACCOUNT_MISMATCH`, `TIMESTAMP_EXPIRED`, etc.), and method signatures unchanged. Do not alter Prisma schema or migrations.

# Test guidelines

Run `npm test`, which executes Jest with coverage in band. Add or extend `*.spec.ts` files colocated with the code under test, primarily in `src/verification/common/validation-pipes`, `src/transactions`, and the `test` directory for any end-to-end assertions.

Mock `PrismaService` for repository and pipe tests rather than hitting a real database. Cover both passing and failing `PipeResult` outcomes, including edge cases like null `confirmedAmount`, missing `clientId`, last-4 account matching, and timestamps just inside and outside the configurable window.

# Lint guidelines

Run `npm run lint` to apply ESLint with autofix across `src`, `apps`, `libs`, and `test`. Resolve any remaining lint errors manually so the suite passes cleanly.

# Style guidelines

Run `npm run format` to apply Prettier before finishing. Match the existing NestJS conventions and keep changes scoped to tests and the noted DTO/config files.

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
