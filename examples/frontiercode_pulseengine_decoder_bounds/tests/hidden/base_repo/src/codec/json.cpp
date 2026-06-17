#include "pulse/codec/json.hpp"
#include <cstdio>
#include <cstdlib>
#include <cctype>
#include <sstream>
#include <algorithm>

namespace pulse {

// ==================================================================
//  Internal recursive-descent JSON reader
// ==================================================================
namespace {

class JsonReader {
public:
    explicit JsonReader(const std::string& s) : src_(s), pos_(0) {}

    void skip_ws() {
        while (pos_ < src_.size() &&
               (src_[pos_] == ' '  || src_[pos_] == '\t' ||
                src_[pos_] == '\n' || src_[pos_] == '\r')) {
            ++pos_;
        }
    }

    char peek() {
        skip_ws();
        return pos_ < src_.size() ? src_[pos_] : '\0';
    }

    void expect(char c) {
        skip_ws();
        if (pos_ >= src_.size() || src_[pos_] != c) {
            throw PulseError(ErrorCode::DecodingError,
                std::string("JSON: expected '") + c +
                "' at position " + std::to_string(pos_));
        }
        ++pos_;
    }

    // Read a JSON string (opening + closing quotes consumed).
    // Inline unescaping of standard JSON escape sequences.
    std::string read_string() {
        skip_ws();
        if (pos_ >= src_.size() || src_[pos_] != '"') {
            throw PulseError(ErrorCode::DecodingError,
                "JSON: expected '\"' at position " + std::to_string(pos_));
        }
        ++pos_; // skip opening quote

        std::string result;
        while (pos_ < src_.size()) {
            char c = src_[pos_++];
            if (c == '"') return result;
            if (c == '\\' && pos_ < src_.size()) {
                char esc = src_[pos_++];
                switch (esc) {
                    case '"':  result += '"';  break;
                    case '\\': result += '\\'; break;
                    case '/':  result += '/';  break;
                    case 'n':  result += '\n'; break;
                    case 'r':  result += '\r'; break;
                    case 't':  result += '\t'; break;
                    case 'b':  result += '\b'; break;
                    case 'f':  result += '\f'; break;
                    case 'u': {
                        if (pos_ + 4 <= src_.size()) {
                            unsigned code = 0;
                            for (int i = 0; i < 4; ++i) {
                                code <<= 4;
                                char h = src_[pos_++];
                                if (h >= '0' && h <= '9')      code |= static_cast<unsigned>(h - '0');
                                else if (h >= 'a' && h <= 'f') code |= 10u + static_cast<unsigned>(h - 'a');
                                else if (h >= 'A' && h <= 'F') code |= 10u + static_cast<unsigned>(h - 'A');
                            }
                            if (code < 0x80) {
                                result += static_cast<char>(code);
                            }
                        }
                        break;
                    }
                    default: result += esc; break;
                }
            } else {
                result += c;
            }
        }
        throw PulseError(ErrorCode::DecodingError, "JSON: unterminated string");
    }

    // Read a raw numeric token (digits, sign, decimal point, exponent).
    std::string read_number_raw() {
        skip_ws();
        std::string s;
        while (pos_ < src_.size()) {
            char c = src_[pos_];
            if (c == '-' || c == '+' || c == '.' ||
                c == 'e' || c == 'E' ||
                (c >= '0' && c <= '9')) {
                s += c;
                ++pos_;
            } else {
                break;
            }
        }
        if (s.empty()) {
            throw PulseError(ErrorCode::DecodingError,
                "JSON: expected number at position " + std::to_string(pos_));
        }
        return s;
    }

    bool read_bool() {
        skip_ws();
        if (pos_ + 4 <= src_.size() &&
            src_[pos_]   == 't' && src_[pos_+1] == 'r' &&
            src_[pos_+2] == 'u' && src_[pos_+3] == 'e') {
            pos_ += 4;
            return true;
        }
        if (pos_ + 5 <= src_.size() &&
            src_[pos_]   == 'f' && src_[pos_+1] == 'a' &&
            src_[pos_+2] == 'l' && src_[pos_+3] == 's' &&
            src_[pos_+4] == 'e') {
            pos_ += 5;
            return false;
        }
        throw PulseError(ErrorCode::DecodingError,
            "JSON: expected boolean at position " + std::to_string(pos_));
    }

    // Consume a comma if present (lenient: allows missing commas).
    void consume_comma_if_present() {
        skip_ws();
        if (pos_ < src_.size() && src_[pos_] == ',') ++pos_;
    }

    // Skip over any JSON value (used for unknown keys).
    void skip_value() {
        skip_ws();
        if (pos_ >= src_.size()) return;
        char c = src_[pos_];
        if (c == '"') {
            read_string();
        } else if (c == 't' || c == 'f') {
            read_bool();
        } else if (c == 'n') {
            pos_ += 4; // "null"
        } else if (c == '{') {
            skip_container('{', '}');
        } else if (c == '[') {
            skip_container('[', ']');
        } else {
            read_number_raw();
        }
    }

private:
    void skip_container(char open, char close) {
        int depth = 0;
        bool in_str = false;
        while (pos_ < src_.size()) {
            char ch = src_[pos_++];
            if (in_str) {
                if (ch == '\\') { if (pos_ < src_.size()) ++pos_; }
                else if (ch == '"') in_str = false;
            } else {
                if (ch == '"') in_str = true;
                else if (ch == open) ++depth;
                else if (ch == close) { --depth; if (depth == 0) return; }
            }
        }
    }

    const std::string& src_;
    size_t pos_;
};

} // anonymous namespace

// ==================================================================
//  String escaping
// ==================================================================

std::string JsonSerializer::escape_string(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 8);
    for (char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n";  break;
            case '\r': out += "\\r";  break;
            case '\t': out += "\\t";  break;
            case '\b': out += "\\b";  break;
            case '\f': out += "\\f";  break;
            default:
                if (static_cast<unsigned char>(c) < 0x20) {
                    char buf[8];
                    std::snprintf(buf, sizeof(buf), "\\u%04x",
                                  static_cast<unsigned>(static_cast<unsigned char>(c)));
                    out += buf;
                } else {
                    out += c;
                }
                break;
        }
    }
    return out;
}

// ==================================================================
//  Bytes <-> hex
// ==================================================================

std::string JsonSerializer::bytes_to_hex(const std::vector<uint8_t>& data) {
    static const char hex_chars[] = "0123456789abcdef";
    std::string out = "0x";
    out.reserve(2 + data.size() * 2);
    for (uint8_t b : data) {
        out += hex_chars[(b >> 4) & 0x0F];
        out += hex_chars[b & 0x0F];
    }
    return out;
}

std::vector<uint8_t> JsonSerializer::hex_to_bytes(const std::string& s) {
    std::vector<uint8_t> out;
    size_t start = (s.size() >= 2 && s[0] == '0' && s[1] == 'x') ? 2 : 0;
    out.reserve((s.size() - start) / 2);
    for (size_t i = start; i + 1 < s.size(); i += 2) {
        auto nibble = [](char c) -> uint8_t {
            if (c >= '0' && c <= '9') return static_cast<uint8_t>(c - '0');
            if (c >= 'a' && c <= 'f') return static_cast<uint8_t>(10 + c - 'a');
            if (c >= 'A' && c <= 'F') return static_cast<uint8_t>(10 + c - 'A');
            return 0;
        };
        out.push_back(static_cast<uint8_t>((nibble(s[i]) << 4) | nibble(s[i + 1])));
    }
    return out;
}

// ==================================================================
//  FieldValue -> JSON fragment
// ==================================================================

std::string JsonSerializer::field_value_to_json(const FieldValue& val) {
    switch (val.index()) {
        case 0: // int64_t
            return std::to_string(std::get<int64_t>(val));
        case 1: { // double
            char buf[64];
            std::snprintf(buf, sizeof(buf), "%.15g", std::get<double>(val));
            std::string s(buf);
            // Ensure doubles always contain a decimal point so the
            // deserializer can distinguish them from integers.
            if (s.find('.') == std::string::npos &&
                s.find('e') == std::string::npos &&
                s.find('E') == std::string::npos) {
                s += ".0";
            }
            return s;
        }
        case 2: // string
            return "\"" + escape_string(std::get<std::string>(val)) + "\"";
        case 3: // bool
            return std::get<bool>(val) ? "true" : "false";
        case 4: // bytes
            return "\"" + bytes_to_hex(std::get<std::vector<uint8_t>>(val)) + "\"";
        default:
            return "null";
    }
}

// ==================================================================
//  Serialize
// ==================================================================

std::string JsonSerializer::serialize(const Event& event) {
    std::string out;
    out.reserve(256);
    out += "{\"type\":\"";
    out += escape_string(event.event_type());
    out += "\",\"timestamp\":";
    out += std::to_string(event.timestamp());
    out += ",\"fields\":{";

    bool first = true;
    for (const auto& [key, val] : event.fields()) {
        if (!first) out += ',';
        first = false;
        out += '"';
        out += escape_string(key);
        out += "\":";
        out += field_value_to_json(val);
    }

    out += "}}";
    return out;
}

// ==================================================================
//  Deserialize
// ==================================================================

Event JsonSerializer::deserialize(const std::string& json) {
    JsonReader rd(json);
    rd.expect('{');

    std::string event_type;
    uint64_t timestamp = 0;
    Event event;

    while (rd.peek() != '}') {
        rd.consume_comma_if_present();
        if (rd.peek() == '}') break;

        std::string key = rd.read_string();
        rd.expect(':');

        if (key == "type") {
            event_type = rd.read_string();
        } else if (key == "timestamp") {
            std::string num = rd.read_number_raw();
            timestamp = std::stoull(num);
        } else if (key == "fields") {
            rd.expect('{');
            while (rd.peek() != '}') {
                rd.consume_comma_if_present();
                if (rd.peek() == '}') break;

                std::string fname = rd.read_string();
                rd.expect(':');

                char c = rd.peek();
                if (c == '"') {
                    std::string sv = rd.read_string();
                    if (sv.size() >= 2 && sv[0] == '0' && sv[1] == 'x') {
                        event.set_bytes(fname, hex_to_bytes(sv));
                    } else {
                        event.set_string(fname, sv);
                    }
                } else if (c == 't' || c == 'f') {
                    event.set_bool(fname, rd.read_bool());
                } else {
                    std::string num = rd.read_number_raw();
                    bool is_float = (num.find('.') != std::string::npos ||
                                     num.find('e') != std::string::npos ||
                                     num.find('E') != std::string::npos);
                    if (is_float) {
                        event.set_double(fname, std::stod(num));
                    } else {
                        event.set_int(fname, std::stoll(num));
                    }
                }
            }
            rd.expect('}');
        } else {
            // Unknown top-level key — skip its value gracefully.
            rd.skip_value();
        }
    }
    rd.expect('}');

    event.set_event_type(event_type);
    event.set_timestamp(timestamp);
    return event;
}

} // namespace pulse
