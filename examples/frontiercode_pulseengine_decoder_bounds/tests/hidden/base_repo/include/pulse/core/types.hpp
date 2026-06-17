#pragma once
#include <cstdint>
#include <string>
#include <variant>
#include <vector>
#include <stdexcept>
#include <optional>

namespace pulse {

using Timestamp = uint64_t;
using EventId = uint64_t;
using FieldValue = std::variant<int64_t, double, std::string, bool, std::vector<uint8_t>>;

enum class FieldType : uint8_t {
    Int64  = 0,
    Double = 1,
    String = 2,
    Bool   = 3,
    Bytes  = 4
};

enum class ErrorCode : uint16_t {
    Ok              = 0,
    InvalidSchema   = 1,
    FieldNotFound   = 2,
    TypeMismatch    = 3,
    BufferFull      = 4,
    BufferEmpty     = 5,
    InvalidArgument = 6,
    Timeout         = 7,
    EncodingError   = 8,
    DecodingError   = 9,
    PatternError    = 10,
    StateError      = 11,
    PipelineError   = 12
};

class PulseError : public std::runtime_error {
public:
    PulseError(ErrorCode code, const std::string& msg)
        : std::runtime_error(msg), code_(code) {}
    ErrorCode code() const { return code_; }
private:
    ErrorCode code_;
};

template<typename T>
class Result {
public:
    static Result ok(T value) { return Result(std::move(value)); }
    static Result err(ErrorCode code, const std::string& msg) {
        return Result(code, msg);
    }

    bool is_ok() const { return has_value_; }
    bool is_err() const { return !has_value_; }

    const T& value() const {
        if (!has_value_) throw PulseError(err_code_, err_msg_);
        return value_;
    }
    T& value() {
        if (!has_value_) throw PulseError(err_code_, err_msg_);
        return value_;
    }
    T unwrap() {
        if (!has_value_) throw PulseError(err_code_, err_msg_);
        return std::move(value_);
    }

    ErrorCode error_code() const { return err_code_; }
    const std::string& error_msg() const { return err_msg_; }

private:
    explicit Result(T val) : value_(std::move(val)), has_value_(true),
                             err_code_(ErrorCode::Ok) {}
    Result(ErrorCode c, std::string m) : has_value_(false), err_code_(c),
                                          err_msg_(std::move(m)) {}
    T value_{};
    bool has_value_;
    ErrorCode err_code_;
    std::string err_msg_;
};

template<>
class Result<void> {
public:
    static Result ok() { return Result(true); }
    static Result err(ErrorCode code, const std::string& msg) {
        return Result(code, msg);
    }

    bool is_ok() const { return ok_; }
    bool is_err() const { return !ok_; }
    void unwrap() const {
        if (!ok_) throw PulseError(err_code_, err_msg_);
    }
    ErrorCode error_code() const { return err_code_; }
    const std::string& error_msg() const { return err_msg_; }

private:
    explicit Result(bool) : ok_(true), err_code_(ErrorCode::Ok) {}
    Result(ErrorCode c, std::string m) : ok_(false), err_code_(c),
                                          err_msg_(std::move(m)) {}
    bool ok_;
    ErrorCode err_code_;
    std::string err_msg_;
};

inline const char* field_type_name(FieldType ft) {
    switch (ft) {
        case FieldType::Int64:  return "Int64";
        case FieldType::Double: return "Double";
        case FieldType::String: return "String";
        case FieldType::Bool:   return "Bool";
        case FieldType::Bytes:  return "Bytes";
    }
    return "Unknown";
}

inline FieldType field_value_type(const FieldValue& v) {
    return static_cast<FieldType>(v.index());
}

} // namespace pulse