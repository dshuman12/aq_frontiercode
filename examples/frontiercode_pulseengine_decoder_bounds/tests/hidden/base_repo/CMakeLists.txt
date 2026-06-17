cmake_minimum_required(VERSION 3.14)
project(PulseEngine VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_compile_options(-Wall -Wextra -Wpedantic -O2)

include_directories(${CMAKE_SOURCE_DIR}/include)

# Collect all source files
file(GLOB_RECURSE LIB_SOURCES src/*.cpp)

# Library target
add_library(pulse STATIC ${LIB_SOURCES})
target_include_directories(pulse PUBLIC ${CMAKE_SOURCE_DIR}/include)

# Testing
enable_testing()

file(GLOB TEST_SOURCES tests/test_*.cpp)
foreach(test_src ${TEST_SOURCES})
    get_filename_component(test_name ${test_src} NAME_WE)
    add_executable(${test_name} ${test_src})
    target_link_libraries(${test_name} pulse)
    target_include_directories(${test_name} PRIVATE ${CMAKE_SOURCE_DIR}/tests)
    add_test(NAME ${test_name} COMMAND ${test_name})
endforeach()

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
