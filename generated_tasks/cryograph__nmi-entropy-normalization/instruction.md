# Task description

`normalized_mutual_information` in `src/community/community.cpp` underreports clustering similarity. Two identical clusterings score `0.5` instead of `1.0`, and across the board NMI values are uniformly compressed toward zero. The pairwise mutual-information accumulation is correct; the defect is confined to the normalization denominator that scales raw mutual information into the `[0,1]` NMI range.

Fix the normalization so that mutual information is divided by the mean of the two clusterings' entropies, `(H(a) + H(b)) / 2`. After the fix:

- Identical clusterings (same grouping, regardless of label naming) must score `1.0`.
- Independent / unrelated clusterings should score near `0.0`.
- Intermediate cases should fall sensibly within `(0, 1)`.

Keep the existing signature `double normalized_mutual_information(const CommunityResult& a, const CommunityResult& b)` and the surrounding `CommunityResult` contract in `community.hpp` unchanged. Preserve degenerate-case handling (e.g. empty assignments or zero total entropy) without introducing division-by-zero. Do not alter modularity, Louvain, or label-propagation behavior; restrict changes to the NMI computation.

# Test guidelines

Add or extend cases in `tests/test_community.cpp` (registered alongside the other suites in `tests/`) covering: identical clusterings returning `1.0`, label-permuted-but-equivalent clusterings also returning `1.0`, statistically independent clusterings returning approximately `0.0`, and a partial-overlap case landing strictly between. Use the shared helpers in `tests/test_framework.hpp` and assert with a tolerance for floating-point comparisons. Avoid touching unrelated suites.

# Lint guidelines

Build with the visible command and run the suite:

```
cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests
```

A clean build with no new warnings and all tests passing is required.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
