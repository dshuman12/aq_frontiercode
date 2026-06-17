#include "src/commands.h"

#include "src/logger.h"

#include <iostream>

namespace jsonschema {

void emit_bundle_warnings(const BundleOptions &options) {
    if (options.contains("without-id")) {
        std::cerr << "warning: You are opting in to remove schema identifiers from the bundle.\n";
        std::cerr << "The only legit use case is preparing a test fixture for legacy clients.\n";
        std::cerr
            << "Do not use this for production schemas because the output may be non-compliant.\n";
    }
}

} // namespace jsonschema
