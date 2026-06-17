#pragma once

#define PULSE_VERSION_MAJOR 1
#define PULSE_VERSION_MINOR 0
#define PULSE_VERSION_PATCH 0
#define PULSE_VERSION_STRING "1.0.0"

namespace pulse {
inline const char* version() { return PULSE_VERSION_STRING; }
} // namespace pulse