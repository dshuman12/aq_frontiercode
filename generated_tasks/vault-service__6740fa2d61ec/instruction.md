# Task description

The `EncryptedData` model in `src/main/java/com/gap/customer/vaultservice/models/EncryptedData.java` backs vault entry persistence and the integration tests under `src/integrationTest`. The existing integration coverage for vault entries no longer passes against this model, indicating that the entity's field exposure, mapping, or constructor surface has drifted from what callers, repositories, and serializers expect.

Investigate why vault entry round-trips fail and align `EncryptedData` so that creating, persisting, reading back, and serializing an encrypted vault entry behaves correctly again. Pay attention to how the entity is constructed and how its fields are read, since other models in the package rely on Lombok (`@Builder`, `@Getter`, `@Data`) and Spring Data `@Table`/`@Column`/`@Id` annotations for consistent mapping and accessor generation.

Keep the persisted column mapping and the public class name stable so the database schema and existing repository queries continue to work. Do not change unrelated models, controllers, or build configuration beyond what this fix requires.

# Test guidelines

Run `./gradlew test` (or `gradle test`) and confirm the suite passes. Standard `test` excludes `**/**Integration*`, so also exercise the vault entry integration coverage that drives this model, including the controller tests under `src/integrationTest/java/com/gap/customer/vaultservice/controller` and supporting fixtures in `src/test/resources`.

Add or update tests when behavior is not already covered, ensuring a vault entry can be built, stored, retrieved with all expected fields intact, and serialized without losing or renaming columns. Cover edge cases such as null optional fields and accessor availability for every persisted column.

# Lint guidelines

Run `./gradlew clean build` and ensure it completes without warnings or errors introduced by your change. Keep Lombok annotation usage consistent with the surrounding models so generated accessors and constructors compile cleanly.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
