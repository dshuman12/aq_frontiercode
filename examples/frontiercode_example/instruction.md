# Task description

Encapsulate all warning logs in a new `auto LOG_WARNING() -> std::ostream &` method in `src/logger.h` such that:

- Warnings are always printed to standard error
- Warnings are always printed, independently of `--verbose`
- The helper automatically prints the `warning:` prefix

Use this new function in every instance of `warning: <message>` messages throughout the codebase.

# Test guidelines

Run `make` and ensure no code changes remain. If there are more code changes, then it means that the code was not formatted properly.

Unless you are sure that the code change is already covered by an existing test case, always edit or create relevant tests (in the `./test` directory) to confirm the changes work and prevent regressions.

The tests are written using GoogleTest and POSIX shell scripts (not bash) and must be registered in the `test/CMakeLists.txt` build definition to run.

# Lint guidelines

Run `make configure compile` to compile and format the code in-place. The compile step comes with a large amount of linter-like checks.

# Style guidelines

You are already on the correct base commit. Create your branch from this commit. Do not rebase or start from master, main, or any other branch.
