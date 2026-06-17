# Task description

Harden PulseEngine's binary decoder so malformed length-prefixed string and byte payloads are rejected cleanly.

The decoder should return a decoding error when the decoded length is larger than the bytes remaining in the buffer. It must not wrap pointer or size arithmetic, attempt huge allocations, throw exceptions, read past the input buffer, or advance as though the payload were valid. Preserve the existing behavior for valid strings, byte arrays, and event decoding.

# Test guidelines

Run the full CMake test suite before finishing:

```bash
mkdir -p build
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
ctest --test-dir build --output-on-failure
```

Add or extend tests under `tests/` for overlarge string and byte lengths. Tests use the lightweight `tests/test_framework.hpp` harness and are discovered from `tests/test_*.cpp` by `CMakeLists.txt`.

# Lint guidelines

Keep the project warning-clean under the existing CMake configuration. The build uses C++17 with `-Wall -Wextra -Wpedantic`.

# Style guidelines

Keep the fix local to the codec decoder. Avoid changing the wire format, public event APIs, unrelated modules, generated build output, documentation, or repository metadata.
