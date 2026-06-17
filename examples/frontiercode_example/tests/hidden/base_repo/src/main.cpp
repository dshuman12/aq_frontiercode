#include "src/commands.h"
#include "src/logger.h"
#include "src/resolver.h"

#include <iostream>
#include <string>

auto main(int argc, char **argv) -> int {
    bool handled = false;

    for (int index = 1; index < argc; ++index) {
        std::string arg = argv[index];
        if (arg == "--verbose") {
            jsonschema::set_verbose(true);
        } else if (arg == "--resolver") {
            jsonschema::CustomResolver resolver(true);
            (void)resolver;
            handled = true;
        } else if (arg == "--bundle-without-id") {
            jsonschema::emit_bundle_warnings(jsonschema::BundleOptions{true});
            handled = true;
        } else if (arg == "--disable-lint-rules") {
            jsonschema::disable_lint_rules("jsonschema.toml");
            handled = true;
        } else if (arg == "--schema-template") {
            jsonschema::get_schema_template("draft-07");
            handled = true;
        } else if (arg == "--empty-jsonl") {
            jsonschema::warn_empty_jsonl("schemas.jsonl");
            handled = true;
        } else {
            std::cerr << "unknown argument: " << arg << "\n";
            return 2;
        }
    }

    if (!handled) {
        std::cout << "jsonschema demo\n";
    }

    return 0;
}
