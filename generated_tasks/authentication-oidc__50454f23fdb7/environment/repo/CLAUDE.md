# CLAUDE.md - Project Context for Claude Code

## Project Overview

This is an **OIDC Authentication Service** built with AWS Lambda functions. It handles authentication flows including OTP, passcode verification, biometrics, and various user management operations.

## Tech Stack

- **Runtime**: Node.js (see `.nvmrc`)
- **Language**: TypeScript
- **Testing**: Vitest
- **Linting**: Prettier
- **Infrastructure**: Terraform (AWS Lambda, API Gateway, DynamoDB)
- **Framework**: Hono (for local test runner)

## Project Structure

```
src/
├── functions/          # Lambda function handlers
│   ├── biometrics/     # Biometric auth (register, verify)
│   ├── email-change/   # Email change flow
│   ├── extra-scope/    # Extra scope authorization
│   ├── forgotten-passcode/  # Password reset flows
│   ├── general/        # Core functions (authorizer, eligibility, token, logout)
│   ├── other/          # Misc (userInfo, changePasscode)
│   ├── otp/            # OTP-only auth flow
│   ├── otp-passcode/   # OTP + passcode auth flow
│   └── phone-change/   # Phone number change flow
├── libs/               # Shared utilities
│   ├── constants.ts    # Environment variables and constants
│   ├── crypto.ts       # JWT signing/verification
│   ├── gatewayUtils.ts # API Gateway response formatting
│   └── ...
├── services/           # Service layer abstractions
│   ├── banking/        # BankingService (customer, account data)
│   ├── card/           # CardService
│   ├── transaction/    # TransactionService (auth transactions)
│   └── user/           # UserService
├── shared-types/       # TypeScript type definitions
└── test-e2e/           # End-to-end tests
    └── local-runner/   # Local Hono server for e2e tests
```

## Key Commands

```bash
# Run unit tests
pnpm test

# Run e2e tests
pnpm run test-e2e

# Run specific test file
pnpm run test-file --file=path/to/test.ts

# Run specific test suite
pnpm run test-suite --suite=path/to/suite

# Lint check
pnpm run lint

# Lint fix
pnpm run lint-fix
```

## Environment Variables

Environment variables are loaded from `.env` and prefixed with `TF_VAR_` in terraform. Key variables are centralized in `src/libs/constants.ts`.

## Testing

- **Unit tests**: Co-located with source files (`*.test.ts`)
- **E2E tests**: Located in `src/test-e2e/`
- **Local runner**: Uses Hono framework to simulate API Gateway locally (`src/test-e2e/local-runner/`)

## Code Patterns

### Lambda Handler Pattern

```typescript
export const handler = async (event: AuthorizerEvent) => {
  const logger = getLogger();
  try {
    // ... handler logic
    return formatJSONResponse({ statusCode: 200, body: { ... } });
  } catch (error) {
    logger.error(`Error: ${error?.message}`);
    return SERVER_ERROR_RESPONSE;
  }
};
```

### LMS Result Pattern

Functions return `LMSResult<T>` for consistent error handling:

```typescript
if (!result.ok) return toHttpResponse(result);
// Use result.data safely
```

### Service Layer

Use service abstractions (`BankingService`, `TransactionService`, etc.) rather than direct adapter calls.

## Git Workflow

- Branch naming: `feature/`, `fix/`, `hal/` prefixes
- Commits: Conventional commits (`feat:`, `fix:`, `chore:`)
- Pre-commit hook: Runs `pnpm run lint-fix`
- After modifying terraform files, run `terraform fmt terraform/` before committing
- do not tag commit messages with author.
- do not add co-authors to commit messages.
- do not include plan files (`plans/`) in commits.

## Important Files

- `terraform/3-gateway.tf` - API Gateway route definitions
- `src/test-e2e/local-runner/api.ts` - Local API route mappings (must match terraform)
- `src/libs/constants.ts` - Centralized constants and env vars
- `src/functions/general/eligibility/` - Scope eligibility checks

## Common Issues

1. **Missing routes**: Ensure `local-runner/api.ts` matches `3-gateway.tf`
2. **Test failures**: Check AWS credentials are valid (`aws sts get-caller-identity`)
3. **Environment variables**: Ensure `.env` is populated (see `.env.example`)

## Claude Notes

- Any created plans are written to `.claude/plans/`
- Always display the plan before applying it

## Workflow Rules

- **Always plan before acting.** When given a task, first outline the steps you intend to take and wait for my approval before executing any changes.
- **Ask clarifying questions** if the task is ambiguous rather than making assumptions.
- **Do not modify files or run commands** until I've confirmed the plan.
- **Distinguish questions from tasks.** If I ask a question, just answer it — don't start implementing anything.

## Ways of working

- typescript use of `any` is discouraged.
- keep arguments simple when passing data. If a function only requires an `id`
  don't pass a whole model this keeps later changes easier to manage
