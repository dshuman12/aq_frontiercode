# Task description

`BluefinUtil` in `src/main/java/com/gap/customer/vaultservice/util/BluefinUtil.java` builds the Bluefin tokenization/de-tokenization payloads and maps vault data types to their Bluefin template references. A defect exists in how the gift card template reference (`giftCardTemplateRef`) is resolved, so gift card data types are paired with the wrong template and produce incorrect requests.

Investigate the template-reference resolution path and fix the `giftCardTemplateRef` handling so gift card data types (gift card number, PIN, and track2 where applicable) map to the correct Bluefin template. Keep the public method signatures and return types of `BluefinUtil` unchanged so existing callers and Spring wiring continue to work. If the corresponding property is read from configuration, ensure the value in `Bluefin/src/main/resources/application-bluefin.properties` is consistent with the corrected lookup.

Credit card, password, and token mappings must remain unchanged. Avoid touching unrelated utilities, generated Voltage client classes, and other property profiles.

# Test guidelines

Run `./gradlew test` (or `gradle test`) and confirm the suite passes.

Add or update unit tests under `src/test/java/com/gap/customer/vaultservice/util` to cover template-reference resolution for each gift card data type and to assert that credit card, password, and token references stay correct. Cover the previously broken `giftCardTemplateRef` case explicitly so the regression cannot reappear, and include any null or unknown data-type edge cases the method must handle gracefully.

# Lint guidelines

Follow the existing code style in the module; do not introduce new linter or build-audit warnings. The standard `./gradlew clean build` must complete without new violations.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
