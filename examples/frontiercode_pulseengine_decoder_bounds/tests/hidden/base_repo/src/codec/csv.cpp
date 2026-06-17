#include "pulse/codec/csv.hpp"
#include <sstream>

namespace pulse {

// ==================================================================
//  Construction
// ==================================================================

CsvFormatter::CsvFormatter(std::vector<std::string> columns, char delimiter)
    : columns_(std::move(columns)), delimiter_(delimiter) {}

// ==================================================================
//  Header row
// ==================================================================

std::string CsvFormatter::header() const {
    std::string out;
    for (size_t i = 0; i < columns_.size(); ++i) {
        if (i > 0) out += delimiter_;
        out += quote_field(columns_[i]);
    }
    out += '\n';
    return out;
}

// ==================================================================
//  Single-row formatting
// ==================================================================

std::string CsvFormatter::format(const Event& event) const {
    std::string out;
    for (size_t i = 0; i < columns_.size(); ++i) {
        if (i > 0) out += delimiter_;

        const auto& col = columns_[i];
        std::string value;

        if (col == "type") {
            value = event.event_type();
        } else if (col == "timestamp") {
            value = std::to_string(event.timestamp());
        } else if (event.has_field(col)) {
            value = field_to_string(event.get_field(col));
        }
        // else: value stays empty (missing field -> empty cell)

        out += quote_field(value);
    }
    out += '\n';
    return out;
}

// ==================================================================
//  Batch formatting (header + all rows)
// ==================================================================

std::string CsvFormatter::format_all(const std::vector<Event>& events) const {
    std::string out = header();
    for (const auto& ev : events) {
        out += format(ev);
    }
    return out;
}

// ==================================================================
//  RFC 4180 quoting
// ==================================================================

std::string CsvFormatter::quote_field(const std::string& val) const {
    // A field must be quoted if it contains the delimiter, a double-quote,
    // or a newline character.
    bool needs_quote = false;
    for (char c : val) {
        if (c == delimiter_ || c == '"' || c == '\n' || c == '\r') {
            needs_quote = true;
            break;
        }
    }
    if (!needs_quote) return val;

    // Wrap in double-quotes; double every internal quote.
    std::string out;
    out.reserve(val.size() + 4);
    out += '"';
    for (char c : val) {
        if (c == '"') out += "\"\"";
        else out += c;
    }
    out += '"';
    return out;
}

// ==================================================================
//  FieldValue -> display string
// ==================================================================

std::string CsvFormatter::field_to_string(const FieldValue& val) {
    switch (val.index()) {
        case 0: // int64_t
            return std::to_string(std::get<int64_t>(val));
        case 1: { // double
            std::ostringstream oss;
            oss << std::get<double>(val);
            return oss.str();
        }
        case 2: // string
            return std::get<std::string>(val);
        case 3: // bool
            return std::get<bool>(val) ? "true" : "false";
        case 4: { // bytes -> hex with 0x prefix
            static const char hex[] = "0123456789abcdef";
            const auto& bytes = std::get<std::vector<uint8_t>>(val);
            std::string out = "0x";
            out.reserve(2 + bytes.size() * 2);
            for (uint8_t b : bytes) {
                out += hex[(b >> 4) & 0x0F];
                out += hex[b & 0x0F];
            }
            return out;
        }
        default:
            return "";
    }
}

} // namespace pulse
