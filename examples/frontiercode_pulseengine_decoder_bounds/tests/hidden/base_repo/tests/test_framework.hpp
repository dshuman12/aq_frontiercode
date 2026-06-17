#pragma once
#include <iostream>
#include <string>
#include <cmath>
#include <vector>
#include <functional>
#include <chrono>
#include <sstream>

namespace pulse_test {

static int g_pass = 0;
static int g_fail = 0;
static int g_total = 0;
static std::string g_current_test;

struct TestEntry {
    std::string name;
    std::function<void()> func;
};

inline std::vector<TestEntry>& test_registry() {
    static std::vector<TestEntry> entries;
    return entries;
}

struct TestRegistrar {
    TestRegistrar(const char* name, std::function<void()> fn) {
        test_registry().push_back({name, std::move(fn)});
    }
};

inline void assert_fail(const char* file, int line, const char* expr) {
    std::cerr << "  FAIL: " << file << ":" << line << " — " << expr << std::endl;
    g_fail++;
    g_total++;
}

inline void assert_pass() {
    g_pass++;
    g_total++;
}

#define TEST_CASE(name) \
    static void test_fn_##name(); \
    static pulse_test::TestRegistrar _reg_##name(#name, test_fn_##name); \
    static void test_fn_##name()

#define ASSERT_TRUE(expr) \
    do { if (!(expr)) { pulse_test::assert_fail(__FILE__, __LINE__, #expr); return; } \
         else { pulse_test::assert_pass(); } } while(0)

#define ASSERT_FALSE(expr) ASSERT_TRUE(!(expr))

#define ASSERT_EQ(a, b) \
    do { auto _a = (a); auto _b = (b); \
         if (_a != _b) { \
             std::ostringstream _os; \
             _os << #a << " == " << #b << "  (got " << _a << " vs " << _b << ")"; \
             pulse_test::assert_fail(__FILE__, __LINE__, _os.str().c_str()); return; \
         } else { pulse_test::assert_pass(); } } while(0)

#define ASSERT_NE(a, b) \
    do { auto _a = (a); auto _b = (b); \
         if (_a == _b) { \
             std::ostringstream _os; \
             _os << #a << " != " << #b << "  (both " << _a << ")"; \
             pulse_test::assert_fail(__FILE__, __LINE__, _os.str().c_str()); return; \
         } else { pulse_test::assert_pass(); } } while(0)

#define ASSERT_LT(a, b) \
    do { auto _a = (a); auto _b = (b); \
         if (!(_a < _b)) { \
             std::ostringstream _os; \
             _os << #a << " < " << #b << "  (got " << _a << " vs " << _b << ")"; \
             pulse_test::assert_fail(__FILE__, __LINE__, _os.str().c_str()); return; \
         } else { pulse_test::assert_pass(); } } while(0)

#define ASSERT_LE(a, b) \
    do { auto _a = (a); auto _b = (b); \
         if (!(_a <= _b)) { \
             std::ostringstream _os; \
             _os << #a << " <= " << #b << "  (got " << _a << " vs " << _b << ")"; \
             pulse_test::assert_fail(__FILE__, __LINE__, _os.str().c_str()); return; \
         } else { pulse_test::assert_pass(); } } while(0)

#define ASSERT_GT(a, b) \
    do { auto _a = (a); auto _b = (b); \
         if (!(_a > _b)) { \
             std::ostringstream _os; \
             _os << #a << " > " << #b << "  (got " << _a << " vs " << _b << ")"; \
             pulse_test::assert_fail(__FILE__, __LINE__, _os.str().c_str()); return; \
         } else { pulse_test::assert_pass(); } } while(0)

#define ASSERT_GE(a, b) \
    do { auto _a = (a); auto _b = (b); \
         if (!(_a >= _b)) { \
             std::ostringstream _os; \
             _os << #a << " >= " << #b << "  (got " << _a << " vs " << _b << ")"; \
             pulse_test::assert_fail(__FILE__, __LINE__, _os.str().c_str()); return; \
         } else { pulse_test::assert_pass(); } } while(0)

#define ASSERT_NEAR(a, b, eps) \
    do { double _a = (a); double _b = (b); double _e = (eps); \
         if (std::fabs(_a - _b) > _e) { \
             std::ostringstream _os; \
             _os << #a << " ~= " << #b << " (eps=" << _e << ")  got " << _a << " vs " << _b; \
             pulse_test::assert_fail(__FILE__, __LINE__, _os.str().c_str()); return; \
         } else { pulse_test::assert_pass(); } } while(0)

#define ASSERT_THROWS(expr) \
    do { bool _threw = false; \
         try { expr; } catch (...) { _threw = true; } \
         if (!_threw) { pulse_test::assert_fail(__FILE__, __LINE__, #expr " did not throw"); return; } \
         else { pulse_test::assert_pass(); } } while(0)

#define ASSERT_STR_EQ(a, b) \
    do { std::string _a = (a); std::string _b = (b); \
         if (_a != _b) { \
             std::ostringstream _os; \
             _os << "\"" << _a << "\" == \"" << _b << "\""; \
             pulse_test::assert_fail(__FILE__, __LINE__, _os.str().c_str()); return; \
         } else { pulse_test::assert_pass(); } } while(0)

} // namespace pulse_test

#define RUN_ALL_TESTS() \
    int main() { \
        int _local_fail = 0; \
        for (auto& entry : pulse_test::test_registry()) { \
            pulse_test::g_current_test = entry.name; \
            int before_fail = pulse_test::g_fail; \
            std::cout << "[ RUN  ] " << entry.name << std::endl; \
            entry.func(); \
            if (pulse_test::g_fail > before_fail) { \
                std::cout << "[ FAIL ] " << entry.name << std::endl; \
                _local_fail++; \
            } else { \
                std::cout << "[ PASS ] " << entry.name << std::endl; \
            } \
        } \
        std::cout << "\n=== Results: " << pulse_test::g_pass << " passed, " \
                  << pulse_test::g_fail << " failed, " \
                  << pulse_test::g_total << " assertions ===" << std::endl; \
        return _local_fail > 0 ? 1 : 0; \
    }
// end of file