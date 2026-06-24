cmake_minimum_required(VERSION 3.14)
project(CryoGraph VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_compile_options(-Wall -Wextra -Wpedantic -O2)

file(GLOB_RECURSE LIB_SOURCES "src/*.cpp")
add_library(cryograph STATIC ${LIB_SOURCES})
target_include_directories(cryograph PUBLIC ${CMAKE_SOURCE_DIR}/src)

file(GLOB TEST_SOURCES "tests/*.cpp")
add_executable(cryograph_tests ${TEST_SOURCES})
target_link_libraries(cryograph_tests PRIVATE cryograph pthread)
target_include_directories(cryograph_tests PRIVATE ${CMAKE_SOURCE_DIR}/src ${CMAKE_SOURCE_DIR}/tests)

enable_testing()
add_test(NAME AllTests COMMAND cryograph_tests)