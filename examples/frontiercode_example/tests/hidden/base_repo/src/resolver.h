#ifndef JSONSCHEMA_RESOLVER_H
#define JSONSCHEMA_RESOLVER_H

#include "src/logger.h"

#include <iostream>

namespace jsonschema {

class CustomResolver {
  public:
    explicit CustomResolver(bool custom_lookup_enabled) {
        if (custom_lookup_enabled) {
            std::cerr << "warning: custom resolver support is experimental.\n";
            std::cerr << "Only use this hook for schemas you fully control.\n";
            std::cerr << "Unexpected remote references may resolve differently in production.\n";
        }
    }
};

} // namespace jsonschema

#endif
