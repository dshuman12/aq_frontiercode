#ifndef JSONSCHEMA_COMMANDS_H
#define JSONSCHEMA_COMMANDS_H

#include <string_view>

namespace jsonschema {

struct BundleOptions {
    bool without_id = false;

    auto contains(std::string_view option) const -> bool {
        return option == "without-id" && without_id;
    }
};

void emit_bundle_warnings(const BundleOptions &options);
void disable_lint_rules(std::string_view config_path);
void get_schema_template(std::string_view schema_name);
void warn_empty_jsonl(std::string_view file_path);

} // namespace jsonschema

#endif
