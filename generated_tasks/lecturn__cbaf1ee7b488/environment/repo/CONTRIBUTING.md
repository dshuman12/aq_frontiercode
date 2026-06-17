# Contributing

Thanks for considering a contribution to Lecturn.

## Getting set up

```bash
bun install
cp .env.example .env
docker compose up -d postgres
```

## Branch naming

- `feat/<short-slug>` for new features
- `fix/<short-slug>` for bug fixes
- `chore/<short-slug>` for tooling, deps, refactors

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/). The `commit-msg`
hook will reject anything else.

```
feat(player): pause on tab blur
fix(scanner): tolerate dotfiles in course folders
chore(deps): bump drizzle-orm
```

## Tests

- `bun run test` — unit tests for both packages
- `bun run test:integration` — backend integration suite (needs Postgres)
- `bun run e2e` — Playwright suite (frontend)

Please add tests for any user-visible behavior you change.

## Code style

Prettier is the source of truth. CI runs `prettier --check`. Run `bun run format`
locally before pushing if you want to skip the rejection-loop.

## Filing PRs

- Keep PRs focused. Split unrelated changes into separate PRs.
- Fill out the PR template — it's there to save reviewer time.
- Link the issue you're closing in the description (`Closes #123`).
