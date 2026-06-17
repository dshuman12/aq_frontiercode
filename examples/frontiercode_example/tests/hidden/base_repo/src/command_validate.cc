#include "src/commands.h"

#include "src/logger.h"

#include <iostream>

namespace jsonschema {

void get_schema_template(std::string_view schema_name) {
    LOG_VERBOSE() << "warning: using built-in template for schema '" << schema_name << "'\n";
}

void warn_empty_jsonl(std::string_view file_path) {
    std::cerr << "warning: The JSONL file is empty: " << file_path << "\n";
}

} // namespace jsonschema
