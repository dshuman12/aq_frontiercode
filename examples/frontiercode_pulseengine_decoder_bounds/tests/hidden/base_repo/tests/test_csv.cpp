#include "test_framework.hpp"
#include "pulse/codec/csv.hpp"

using namespace pulse;

// ------------------------------------------------------------------
//  Header tests
// ------------------------------------------------------------------

TEST_CASE(csv_header_basic) {
    CsvFormatter fmt({"type", "timestamp", "x", "y"});
    ASSERT_STR_EQ(fmt.header(), "type,timestamp,x,y\n");
}

TEST_CASE(csv_header_single_column) {
    CsvFormatter fmt({"name"});
    ASSERT_STR_EQ(fmt.header(), "name\n");
}

// ------------------------------------------------------------------
//  Format single event
// ------------------------------------------------------------------

TEST_CASE(csv_format_int_field) {
    Event e("click", 1000);
    e.set_int("x", 42);
    CsvFormatter fmt({"type", "timestamp", "x"});
    ASSERT_STR_EQ(fmt.format(e), "click,1000,42\n");
}

TEST_CASE(csv_format_all_types) {
    Event e("ev", 500);
    e.set_int("i", 7);
    e.set_double("d", 2.5);
    e.set_string("s", "hi");
    e.set_bool("b", true);
    e.set_bytes("raw", {0xAB, 0xCD});

    CsvFormatter fmt({"i", "d", "s", "b", "raw"});
    ASSERT_STR_EQ(fmt.format(e), "7,2.5,hi,true,0xabcd\n");
}

TEST_CASE(csv_format_missing_fields) {
    Event e("ev", 0);
    e.set_int("x", 1);
    // "y" is not set
    CsvFormatter fmt({"x", "y", "z"});
    ASSERT_STR_EQ(fmt.format(e), "1,,\n");
}

TEST_CASE(csv_format_empty_event) {
    Event e("ev", 0);
    CsvFormatter fmt({"type", "timestamp"});
    ASSERT_STR_EQ(fmt.format(e), "ev,0\n");
}

// ------------------------------------------------------------------
//  Quoting / escaping
// ------------------------------------------------------------------

TEST_CASE(csv_quoting_delimiter) {
    Event e("ev", 0);
    e.set_string("msg", "hello,world");
    CsvFormatter fmt({"msg"});
    ASSERT_STR_EQ(fmt.format(e), "\"hello,world\"\n");
}

TEST_CASE(csv_quoting_quotes) {
    Event e("ev", 0);
    e.set_string("msg", "say \"hi\"");
    CsvFormatter fmt({"msg"});
    ASSERT_STR_EQ(fmt.format(e), "\"say \"\"hi\"\"\"\n");
}

TEST_CASE(csv_quoting_newline) {
    Event e("ev", 0);
    e.set_string("msg", "line1\nline2");
    CsvFormatter fmt({"msg"});
    std::string row = fmt.format(e);
    // The field should be wrapped in double-quotes
    ASSERT_TRUE(row.size() > 0);
    ASSERT_EQ(row[0], '"');
}

// ------------------------------------------------------------------
//  Custom delimiter
// ------------------------------------------------------------------

TEST_CASE(csv_custom_delimiter) {
    Event e("ev", 0);
    e.set_int("a", 1);
    e.set_int("b", 2);
    CsvFormatter fmt({"a", "b"}, ';');
    ASSERT_STR_EQ(fmt.header(), "a;b\n");
    ASSERT_STR_EQ(fmt.format(e), "1;2\n");
}

TEST_CASE(csv_custom_delimiter_quoting) {
    // A semicolon inside a value must trigger quoting when delimiter is ';'
    Event e("ev", 0);
    e.set_string("msg", "a;b");
    CsvFormatter fmt({"msg"}, ';');
    ASSERT_STR_EQ(fmt.format(e), "\"a;b\"\n");
}

// ------------------------------------------------------------------
//  format_all
// ------------------------------------------------------------------

TEST_CASE(csv_format_all_events) {
    Event e1("click", 100);
    e1.set_int("x", 1);
    Event e2("click", 200);
    e2.set_int("x", 2);

    CsvFormatter fmt({"type", "timestamp", "x"});
    std::string csv = fmt.format_all({e1, e2});
    ASSERT_STR_EQ(csv, "type,timestamp,x\nclick,100,1\nclick,200,2\n");
}

TEST_CASE(csv_format_all_empty) {
    CsvFormatter fmt({"a", "b"});
    std::string csv = fmt.format_all({});
    // Should still produce header even with no events
    ASSERT_STR_EQ(csv, "a,b\n");
}

RUN_ALL_TESTS()
