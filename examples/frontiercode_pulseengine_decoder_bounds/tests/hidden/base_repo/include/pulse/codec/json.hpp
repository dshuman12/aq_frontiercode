#pragma once
#include "pulse/core/event.hpp"
#include <string>
#include <vector>
#include <cstdint>

namespace pulse {

/// Hand-written JSON serializer and deserializer for Event objects.
///
/// Produces JSON of the form:
///   {"type":"...","timestamp":N,"fields":{"key":value,...}}
///
/// Field type mapping:
///   Int64  -> JSON number (no decimal point)
///   Double -> JSON number (with decimal point)
///   String -> JSON quoted string
///   Bool   -> JSON true / false
///   Bytes  -> JSON string with "0x" hex prefix
///
/// Supports standard JSON string escaping for quotes, backslashes,
/// and control characters (\n, \r, \t, \b, \f, \uXXXX).
class JsonSerializer {
public:
    /// Serialize an Event to a compact JSON string.
    static std::string serialize(const Event& event);

    /// Deserialize a JSON string back into an Event.
    /// Throws PulseError(DecodingError) on malformed input.
    static Event deserialize(const std::string& json);

private:
    /// Escape a string value for JSON output.
    static std::string escape_string(const std::string& s);

    /// Convert a byte vector to a hex string with "0x" prefix.
    static std::string bytes_to_hex(const std::vector<uint8_t>& data);

    /// Convert a "0x..." hex string back to a byte vector.
    static std::vector<uint8_t> hex_to_bytes(const std::string& hex);

    /// Convert a single FieldValue to its JSON text representation.
    static std::string field_value_to_json(const FieldValue& val);
};

} // namespace pulse
