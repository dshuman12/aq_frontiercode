#ifndef JSONSCHEMA_LOGGER_H
#define JSONSCHEMA_LOGGER_H

#include <iostream>
#include <streambuf>

namespace jsonschema {
namespace detail {

class NullBuffer : public std::streambuf {
public:
    auto overflow(int ch) -> int override { return ch; }
};

inline auto null_stream() -> std::ostream & {
    static NullBuffer buffer;
    static std::ostream stream(&buffer);
    return stream;
}

inline auto verbose_state() -> bool & {
    static bool enabled = false;
    return enabled;
}

}  // namespace detail

inline void set_verbose(bool enabled) {
    detail::verbose_state() = enabled;
}

inline auto LOG_VERBOSE() -> std::ostream & {
    return detail::verbose_state() ? std::cerr : detail::null_stream();
}

}  // namespace jsonschema

#endif
