#include "src/commands.h"

#include "src/logger.h"

namespace jsonschema {

void disable_lint_rules(std::string_view config_path) {
    LOG_VERBOSE() << "warning: lint rules disabled by " << config_path << "\n";
}

} // namespace jsonschema
