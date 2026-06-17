#include "src/logger.h"
#include "src/schema.h"

#include <iostream>
#include <string>

namespace {

auto next_arg(int &index, int argc, char **argv) -> std::string {
    if (index + 1 >= argc) {
        return "";
    }
    ++index;
    return argv[index];
}

}  // namespace

auto main(int argc, char **argv) -> int {
    bool handled = false;

    for (int index = 1; index < argc; ++index) {
        std::string arg = argv[index];
        if (arg == "--verbose") {
            jsonschema::set_verbose(true);
        } else if (arg == "--warn-unknown") {
            jsonschema::warn_unknown_keyword(next_arg(index, argc, argv));
            handled = true;
        } else if (arg == "--warn-remove-ids") {
            jsonschema::warn_removed_schema_identifiers();
            handled = true;
        } else if (arg == "--warn-dialect") {
            jsonschema::warn_dialect_fallback();
            handled = true;
        } else if (arg == "--debug-scan") {
            jsonschema::log_schema_scan();
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
