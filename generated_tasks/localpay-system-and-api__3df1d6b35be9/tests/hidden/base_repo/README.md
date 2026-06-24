# LocalPay

A NestJS service that verifies diaspora deposits made to Ethiopian banks, enforces tamper-resistant receipts, and hands the funds off either to an automated topping-up service or a provable gateway flow. It powers the web interface (`/api/...`) plus the platform-to-platform gateway endpoints and captures every check in Prisma for auditing.

## Tech stack

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)

## System overview
- **NestJS + Prisma + PostgreSQL**: the app is structured as feature modules (`verification`, `funding`, `gateway`, `web-api`, `transactions`, `admin`) wired together in `app.module.ts` with global throttling, interceptors, and validation.
- **Bot-style Verification Engine**: `VerificationService` orchestrates receipt intake, extraction (via `GenericValidation` + bank parsers for CBE, Telebirr, Ebirr, Abyssinia, NIB), and the multi-stage pipeline (`DuplicateTransactionPipe`, `AmountMatchesPipe`, `ReceiverAccountMatchesPipe`, `TimestampValidPipe`).
- **Funding and Gateway adapters**: once the pipeline returns `PASS`, `FundingService` calls your external payout API (via `EXTERNAL_API_URL`/`EXTERNAL_API_KEY`) while `GatewayService` exposes a programmable checkout for third-party platforms.
- **Web API surface**: `web-api` module exposes `POST /api/deposit/single`, `POST /api/deposit/bulk`, `GET /api/deposit/receiving-account`, and `GET /api/history` guarded by `WebAuthGuard`, which validates a JWT issued by the external platform (session signed with `SESSION_SECRET`).
- **Telemetry & Safety**: `helmet`, the global `ValidationPipe`, logging/BigInt/UserSync interceptors, and the throttler (default: 30 req/min, deposit: 7 req/min) keep things sane.

## Core flows
### Single deposit (`/api/deposit/single`)
1. SMS receipts hit `SmsPreValidatorService` and link receipts hit `BANK_URL_PIPE_REGISTRY` before any heavy lifting.
2. `VerificationService.verify()` creates a `DepositRequest`, records the receipt, extracts amount+txId via the generic validation layer (`link`, `sms`, or OCR), writes a `CrawlResult`, then runs the four verification pumps.
3. Pipe failures translate into `FAIL_RETRYABLE`, `FAIL_HARD`, or `AMBIGUOUS` responses; passes surface the transaction ID and let downstream systems fund or redirect (gateway success URL optional).

### Bulk deposit (`/api/deposit/bulk`)
1. Each uploaded proof is pre-checked (`SmsPreValidatorService`, link pipe) and parsed server-side via `extractBulkReceipt()`.
2. The decoded receipts must match the user-declared total (with a 0.01 ETB tolerance) before entering the shared pipeline.
3. `verifyBulk()` writes `DepositRequest` + `CrawlResult` per receipt, keeps track of successes, and stops at the first failing receipt with an index and reason.
4. A passed bulk flow triggers `FundingService.executeBulk()` to mark deposits as `FUNDED` and persist `Transaction` rows.

### Pipeline stages
Each deposit logs these checkpoints through `VerificationStage` events and the `verification` table so the UI can display progress (see `src/common/types/type.ts` for stage labels). The stages are:
- `duplicate-check` (ensure the TX ID was not used before)
- `amount-check` (confirmed amount vs declared amount)
- `receiver-check` (receiver account/name matches the active receiving account for the chosen bank)
- `timestamp-check` (payment time is within the acceptable window configurable via `admin_config.diffHours`).
Failures use `PIPELINE_STATUS_MAP` in `transactions.service.ts` to translate pipeline outcomes into `DepositStatus` values (`REJECTED_RETRYABLE`, `REJECTED_HARD`, `PENDING_MANUAL_REVIEW`, etc.).

## API modules
- **`web-api/deposit`**: authenticated endpoints for single/bulk deposits plus `GET /api/deposit/receiving-account` so the frontend knows which Ethiopian bank accounts are currently active (seeded via `prisma/seed.ts`).
- **`web-api/history`**: paginated deposit history per user, surface statuses, rejection reasons, and the confirmed transaction ID.
- **`web-api/auth`**: `WebAuthGuard` verifies the JWT from the front-end, and `UserSyncInterceptor` lazily `upsert`s the user via `AuthService.syncUser()` so Prisma tracks them under `users.authId`.
- **`gateway`**: Platform-to-platform workflow (`POST /api/gateway/checkout` to create a session, `POST /api/gateway/verify/:checkoutId` to confirm payment). Tokens and redirect parameters share `URL_SECRET` so both webhook and UI flows remain signed.

## Database schema highlights (`prisma/schema.prisma`)
| Model | Responsibility |
| --- | --- |
| `User` | Stores external `authId` (the platform's user ID), email, and relationship to deposits.
| `DepositRequest` | Central record for every verification attempt, includes `amount`, `paymentMethod`, `retryCount`, `maxRetries`, `status`, and audit fields for manual review.
| `Receipt` | Raw proof submitted (link, SMS, screenshot file ID) plus the extracted transaction number referenced later.
| `CrawlResult` | Bank-side verification response with the confirmed amount, receiver name/account, timestamp, and payment status.
| `Verification` | One row per pipe run; stored check name, pass/fail, reason code, and detail for admin reporting.
| `Transaction` | Created once funding succeeds; links to `depositRequestId` and holds bankroll response placeholder.
| `AdminConfig` / `ReceivingAccount` / `BankParserConfig` | Config tables for retry limits, active receiving accounts, and bank-specific parser hints.
| `GatewayCheckout` | Tracks third-party checkout sessions, webhook URLs, statuses, and success URLs.

## Environment variables
| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string for Prisma.
| `SESSION_SECRET` | HMAC secret used by `WebAuthGuard` to verify front-end JWTs.
| `URL_SECRET` | Shared secret for generating signed redirects and gateway checkout tokens (`AuthService.buildRedirectParams` and `CheckoutTokenService`).
| `NEXT_PUBLIC_APP_DOMAIN` | Issuer claim for checkout tokens (must match the front-end domain that opens a checkout).
| `FRONTEND_URL` | Used by `GatewayService` to redirect back to `https://<frontend>/deposit/<token>`.
| `GATEWAY_API_KEY` / `GATEWAY_API_SECRET` | Credentials that external platforms must provide before calling `/api/gateway/checkout`.
| `EXTERNAL_API_URL` / `EXTERNAL_API_KEY` | Your actual funding provider; `FundingService` hits this endpoint before marking a deposit `FUNDED`.
| `PORT` | HTTP server port (defaults to `3000`).
| `NODE_ENV` | Controls Nest's logger verbosity (`production` trims to `error` + `warn`).

## Getting started
1. `npm install` (requires Node.js 18+).
2. Create `.env` with the variables above.
3. Run Prisma migrations and seed the receiving accounts:
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```
4. Launch the dev server:
   ```bash
   npm run start:dev
   ```
5. Open `http://localhost:3000/api` guarded endpoints (attach `Authorization: Bearer <token>`). Front-end tokens must encode `userId` + `email` and be signed with `SESSION_SECRET`.

## Scripts
- `npm run start` / `npm run start:prod`: start the compiled `dist/main.js`.
- `npm run start:dev`: run Nest in watch mode.
- `npm run build`: compile via `nest build`.
- `npm run lint`: run ESLint on apps/libs/test.
- `npm run format`: prettier-format the TypeScript sources and tests.
- `npm run test` / `npm run test:e2e`: Jest unit and end-to-end suites.
- `npm run test:cov`: run coverage report.

## API reference
### Authentication
All `/api` routes expect `Authorization: Bearer <session jwt>`. The JWT payload must contain `userId` and `email` and be signed with `SESSION_SECRET`.

### `/api/deposit/receiving-account` (GET)
Returns every active receiving account (`paymentMethod`, `accountNumber`, `accountName`). Useful for populating payment instructions on the frontend.

### `/api/deposit/single` (POST)
Payload: `amount`, `paymentMethod`, `verificationMethod` (`LINK | SMS | SCREENSHOT`), optional `rawProof`, optional `checkoutId`, optional `accountNumber` (for SMS when multiple source accounts exist). Uses `ValidationPipe`/`Throttle(deposit)` to protect the endpoint. Responses map `PipelineResult` statuses to user-friendly messages.

### `/api/deposit/bulk` (POST)
Payload: `declaredTotal`, `paymentMethod`, `verificationMethod`, and an array of receipts (each `amount`, optional `rawProof`, optional `telegramFileId`). Validates everything before processing and returns details for each verified receipt or the index of the first failure.

### `/api/history` (GET)
Paginated history of deposits for the authenticated user. Supports `page` (>=0) and `pageSize` (1-50); returns deposit metadata, status, rejection reason, and associated transaction ID.

### `/api/gateway/checkout` (POST)
Called by third-party platforms to open a deposit session. Requires API credentials (`GATEWAY_API_KEY`, `GATEWAY_API_SECRET`) and returns a signed checkout URL that includes a `CheckoutTokenService` payload.

### `/api/gateway/verify/:checkoutId` (POST)
Called after the user's bank deposit is verified; marks the checkout as `PAID`, records the `transactionId`, fires optional webhooks, and updates the deposit status to `FUNDED` along with a `Transaction` record.

## Security and reliability notes
- `helmet` + `CORS` guard common attack vectors.
- Global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` reduces injection risk.
- `ThrottlerModule` provides a default 30 req/min cap plus a custom `deposit` rate limiter that caps heavy OCR work to 7 req/min.
- `LoggingInterceptor` logs every request/response, while `BigIntInterceptor` serializes Prisma's `bigint` fields and `UserSyncInterceptor` keeps Prisma's `users` table in sync with the latest external session info.
- Receipt parsing is centralized in `GenericValidation`, which dispatches to `LinkParserService`, `OcrService` (Tesseract + Puppeteer), and `SmsParserService` backed by bank-specific regex configs in `SMS_CONFIGS`.

## Funding & manual review
- Successfully verified deposits land in the `VERIFIED` state inside `DepositRequest`. `FundingService.execute()` and `executeBulk()` then call the external funding API, set the status to `FUNDED`, and create a `Transaction` row.
- Manual review toggles are stubbed in `AdminService` (e.g., `manualReview`, `updateConfig`, `updateReceivingAccount`). Admin workflows can mark deposits as `MANUALLY_APPROVED`/`MANUALLY_REJECTED` using the same `depositRequest` records.

## Next steps
1. Connect the stubbed `FundingService.fund()` to a real payment provider and widen success/error handling.
2. Add Prisma-backed validation for `BankParserConfig` and keep parser hints/data in-sync with new banks.
3. Implement proper webhook delivery from `GatewayService.createCheckout()`/`verifyCheckout()` once partner APIs are ready.
4. Expand SMS/link sample coverage in `SmsPreValidatorService` and `BANK_URL_PIPE_REGISTRY` for additional Ethiopian banks.
