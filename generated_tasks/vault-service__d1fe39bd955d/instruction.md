# Task description

The Bluefin tokenization client currently relies on hard-coded HTTP timeout values when building its `RestTemplate`, which makes it impossible to tune behavior per environment when Bluefin becomes slow or unresponsive. Make the connection timeout and the connection-pool (connection-request) timeout for Bluefin configurable so operators can adjust them without code changes.

In `Bluefin/src/main/java/com/gap/gid/config/RestTemplateConfig.java`, replace the fixed timeout values with externally supplied configuration, exposing sensible defaults so existing deployments keep working unchanged. Surface the corresponding toggle/values through `VaultFeatureToggle` so the scheduler-driven lookup path can read them, and update `LookUpScheduler` to honor the configured values when it drives Bluefin calls. Add any new property keys or constant names to `VaultConstants` rather than scattering string literals.

Keep the request/read-timeout behavior and the existing public method signatures intact unless a new parameter is genuinely required, and do not alter unrelated Voltage adapter or repository code. Defaults must preserve current timeout durations so behavior is unchanged when no override is provided.

# Test guidelines

Run `./gradlew test` (or `gradle test`) and ensure the suite passes.

Add or update tests under `src/test/java/com/gap/customer/vaultservice/scheduler` (notably `LookUpSchedulerTest`) to confirm the scheduler reads the configurable connection and pool timeout values, applies them, and falls back to defaults when the properties are absent. Cover both the override path and the default path so the configurable behavior is locked in against regressions.

# Lint guidelines

No separate lint step is required; the Gradle build applies the project's compilation and static checks. Ensure `./gradlew build` compiles cleanly with no new warnings introduced by the change.

# Style guidelines

Match the existing Spring/Lombok conventions used in the surrounding classes: inject configuration via standard Spring property binding, name constants consistently in `VaultConstants`, and avoid inline magic numbers. You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
