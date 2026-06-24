#pragma once
#include <iostream>
#include <string>
#include <vector>
#include <functional>
#include <sstream>
#include <cmath>
#include <chrono>

namespace cryo_test {

struct TestCase {
    std::string name;
    std::string suite;
    std::function<void()> fn;
};

struct TestResult {
    std::string name;
    std::string suite;
    bool passed;
    std::string message;
};

class TestRegistry {
public:
    static TestRegistry& instance() {
        static TestRegistry reg;
        return reg;
    }

    void add(const std::string& suite, const std::string& name, std::function<void()> fn) {
        cases_.push_back({name, suite, std::move(fn)});
    }

    int run_all() {
        int passed = 0, failed = 0, total = 0;
        std::vector<TestResult> failures;
        std::string current_suite;

        for (auto& tc : cases_) {
            if (tc.suite != current_suite) {
                current_suite = tc.suite;
                std::cout << "\n=== " << current_suite << " ===" << std::endl;
            }
            total++;
            try {
                tc.fn();
                passed++;
                std::cout << "  [PASS] " << tc.name << std::endl;
            } catch (const std::exception& e) {
                failed++;
                std::cout << "  [FAIL] " << tc.name << ": " << e.what() << std::endl;
                failures.push_back({tc.name, tc.suite, false, e.what()});
            }
        }

        std::cout << "\n========================================" << std::endl;
        std::cout << "Results: " << passed << " passed, " << failed << " failed, "
                  << total << " total" << std::endl;
        if (!failures.empty()) {
            std::cout << "\nFailures:" << std::endl;
            for (auto& f : failures) {
                std::cout << "  " << f.suite << "/" << f.name << ": " << f.message << std::endl;
            }
        }
        std::cout << "========================================" << std::endl;
        return failed > 0 ? 1 : 0;
    }

private:
    std::vector<TestCase> cases_;
};

struct TestRegistrar {
    TestRegistrar(const std::string& suite, const std::string& name, std::function<void()> fn) {
        TestRegistry::instance().add(suite, name, std::move(fn));
    }
};

class AssertionError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

inline void assert_true(bool cond, const std::string& msg = "expected true") {
    if (!cond) throw AssertionError(msg);
}

inline void assert_false(bool cond, const std::string& msg = "expected false") {
    if (cond) throw AssertionError(msg);
}

template<typename A, typename B>
void assert_eq(const A& a, const B& b, const std::string& ctx = "") {
    if (!(a == b)) {
        std::ostringstream oss;
        oss << "expected " << a << " == " << b;
        if (!ctx.empty()) oss << " (" << ctx << ")";
        throw AssertionError(oss.str());
    }
}

template<typename A, typename B>
void assert_ne(const A& a, const B& b, const std::string& ctx = "") {
    if (a == b) {
        std::ostringstream oss;
        oss << "expected " << a << " != " << b;
        if (!ctx.empty()) oss << " (" << ctx << ")";
        throw AssertionError(oss.str());
    }
}

template<typename A, typename B>
void assert_lt(const A& a, const B& b, const std::string& ctx = "") {
    if (!(a < b)) {
        std::ostringstream oss;
        oss << "expected " << a << " < " << b;
        if (!ctx.empty()) oss << " (" << ctx << ")";
        throw AssertionError(oss.str());
    }
}

template<typename A, typename B>
void assert_le(const A& a, const B& b, const std::string& ctx = "") {
    if (!(a <= b)) {
        std::ostringstream oss;
        oss << "expected " << a << " <= " << b;
        if (!ctx.empty()) oss << " (" << ctx << ")";
        throw AssertionError(oss.str());
    }
}

template<typename A, typename B>
void assert_gt(const A& a, const B& b, const std::string& ctx = "") {
    if (!(a > b)) {
        std::ostringstream oss;
        oss << "expected " << a << " > " << b;
        if (!ctx.empty()) oss << " (" << ctx << ")";
        throw AssertionError(oss.str());
    }
}

inline void assert_near(double a, double b, double eps = 1e-9, const std::string& ctx = "") {
    if (std::fabs(a - b) > eps) {
        std::ostringstream oss;
        oss << "expected |" << a << " - " << b << "| <= " << eps;
        if (!ctx.empty()) oss << " (" << ctx << ")";
        throw AssertionError(oss.str());
    }
}

template<typename Fn>
void assert_throws(Fn fn, const std::string& ctx = "expected exception") {
    bool caught = false;
    try { fn(); } catch (...) { caught = true; }
    if (!caught) throw AssertionError(ctx);
}

template<typename A, typename B>
void assert_ge(const A& a, const B& b, const std::string& ctx = "") {
    if (!(a >= b)) {
        std::ostringstream oss;
        oss << "expected " << a << " >= " << b;
        if (!ctx.empty()) oss << " (" << ctx << ")";
        throw AssertionError(oss.str());
    }
}

} // namespace cryo_test

#define CRYO_TEST(suite, name) \
    static void cryo_test_##suite##_##name(); \
    static cryo_test::TestRegistrar cryo_reg_##suite##_##name( \
        #suite, #name, cryo_test_##suite##_##name); \
    static void cryo_test_##suite##_##name()