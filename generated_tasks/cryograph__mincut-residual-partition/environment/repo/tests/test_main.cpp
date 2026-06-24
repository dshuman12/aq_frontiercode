#include "test_framework.hpp"

int main() {
    return cryo_test::TestRegistry::instance().run_all();
}