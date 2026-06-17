#include "src/schema.h"

#include "src/logger.h"

#include <iostream>

namespace jsonschema {

void warn_unknown_keyword(std::string_view keyword) {
    LOG_VERBOSE() << "warning: unknown keyword '" << keyword << "' ignored\n";
}

void warn_removed_schema_identifiers() {
    std::cerr << "warning: You are opting in to remove schema identifiers from the bundled schemas.\n";
    std::cerr << "The only legit use case is preparing a test fixture for legacy clients.\n";
    std::cerr << "Do not use this for production schemas because the output may be non-compliant.\n";
}

void warn_dialect_fallback() {
    LOG_VERBOSE() << "warning: falling back to draft-07 because no $schema was declared\n";
}

void log_schema_scan() {
    LOG_VERBOSE() << "scanned schema bundle\n";
}

}  // namespace jsonschema
