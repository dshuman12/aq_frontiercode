#ifndef JSONSCHEMA_SCHEMA_H
#define JSONSCHEMA_SCHEMA_H

#include <string_view>

namespace jsonschema {

void warn_unknown_keyword(std::string_view keyword);
void warn_removed_schema_identifiers();
void warn_dialect_fallback();
void log_schema_scan();

}  // namespace jsonschema

#endif
