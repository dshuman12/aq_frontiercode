#pragma once
#include "pulse/core/event.hpp"
#include <string>
#include <vector>

namespace pulse {

/// Formats Event objects as CSV (Comma-Separated Values) rows.
///
/// Columns are defined at construction time. Two special column names
/// are recognised:
///   "type"      — maps to Event::event_type()
///   "timestamp" — maps to Event::timestamp()
/// All other column names are looked up as event field names.
///
/// Values containing the delimiter, double-quotes, or newlines are
/// quoted per RFC 4180 (embedded quotes are doubled).
/// Missing fields produce an empty cell.
class CsvFormatter {
public:
    /// Construct with an ordered list of column names and an optional
    /// field delimiter (defaults to comma).
    CsvFormatter(std::vector<std::string> columns, char delimiter = ',');

    /// Return the CSV header row (newline-terminated).
    std::string header() const;

    /// Format a single Event as one CSV data row (newline-terminated).
    std::string format(const Event& event) const;

    /// Format a batch: header row followed by one row per event.
    std::string format_all(const std::vector<Event>& events) const;

    /// Current delimiter character.
    char delimiter() const { return delimiter_; }

    /// Configured column list.
    const std::vector<std::string>& columns() const { return columns_; }

private:
    /// Quote a cell value if it contains the delimiter, quotes, or newlines.
    std::string quote_field(const std::string& val) const;

    /// Convert any FieldValue variant to a display string.
    static std::string field_to_string(const FieldValue& val);

    std::vector<std::string> columns_;
    char delimiter_;
};

} // namespace pulse
