#include "test_framework.hpp"
#include "pulse/codec/crc32.hpp"

using namespace pulse;

// ------------------------------------------------------------------
//  Known check values
// ------------------------------------------------------------------

TEST_CASE(crc32_empty_data) {
    // CRC32 of zero bytes: init 0xFFFFFFFF ^ final 0xFFFFFFFF = 0
    uint32_t crc = CRC32::compute(std::string(""));
    ASSERT_EQ(crc, (uint32_t)0x00000000);
}

TEST_CASE(crc32_known_check_value) {
    // The canonical CRC-32 check value for "123456789"
    uint32_t crc = CRC32::compute(std::string("123456789"));
    ASSERT_EQ(crc, (uint32_t)0xCBF43926);
}

TEST_CASE(crc32_single_byte) {
    // Non-trivial: CRC of a single zero byte
    std::vector<uint8_t> data = {0x00};
    uint32_t crc = CRC32::compute(data);
    // Just verify it's non-zero (table[0xFF] ^ 0xFFFFFFFF)
    ASSERT_NE(crc, (uint32_t)0);
}

// ------------------------------------------------------------------
//  Overload consistency
// ------------------------------------------------------------------

TEST_CASE(crc32_string_matches_pointer) {
    std::string s = "hello world";
    uint32_t crc_str = CRC32::compute(s);
    uint32_t crc_ptr = CRC32::compute(
        reinterpret_cast<const uint8_t*>(s.data()), s.size());
    ASSERT_EQ(crc_str, crc_ptr);
}

TEST_CASE(crc32_vector_matches_pointer) {
    std::vector<uint8_t> v = {0x01, 0x02, 0x03, 0x04, 0x05};
    uint32_t crc_vec = CRC32::compute(v);
    uint32_t crc_ptr = CRC32::compute(v.data(), v.size());
    ASSERT_EQ(crc_vec, crc_ptr);
}

// ------------------------------------------------------------------
//  Incremental vs one-shot
// ------------------------------------------------------------------

TEST_CASE(crc32_incremental_equals_oneshot) {
    std::string data = "The quick brown fox jumps over the lazy dog";
    uint32_t oneshot = CRC32::compute(data);

    CRC32 crc;
    crc.update(reinterpret_cast<const uint8_t*>(data.data()), data.size());
    uint32_t incremental = crc.finalize();

    ASSERT_EQ(oneshot, incremental);
}

TEST_CASE(crc32_incremental_chunked) {
    // Feed the data in two chunks — result must match one-shot.
    std::string full = "123456789";
    uint32_t oneshot = CRC32::compute(full);

    CRC32 crc;
    std::string part1 = "12345";
    std::string part2 = "6789";
    crc.update(reinterpret_cast<const uint8_t*>(part1.data()), part1.size());
    crc.update(reinterpret_cast<const uint8_t*>(part2.data()), part2.size());
    uint32_t chunked = crc.finalize();

    ASSERT_EQ(oneshot, chunked);
    ASSERT_EQ(chunked, (uint32_t)0xCBF43926);
}

TEST_CASE(crc32_single_byte_update) {
    // Feed "123456789" one byte at a time
    std::string data = "123456789";
    CRC32 crc;
    for (char c : data) {
        crc.update(static_cast<uint8_t>(c));
    }
    ASSERT_EQ(crc.finalize(), (uint32_t)0xCBF43926);
}

// ------------------------------------------------------------------
//  Reset
// ------------------------------------------------------------------

TEST_CASE(crc32_reset) {
    CRC32 crc;
    crc.update(reinterpret_cast<const uint8_t*>("junk"), 4);

    crc.reset();
    // After reset, feeding "123456789" should give the standard value.
    std::string data = "123456789";
    crc.update(reinterpret_cast<const uint8_t*>(data.data()), data.size());
    ASSERT_EQ(crc.finalize(), (uint32_t)0xCBF43926);
}

TEST_CASE(crc32_finalize_idempotent) {
    std::string data = "test";
    CRC32 crc;
    crc.update(reinterpret_cast<const uint8_t*>(data.data()), data.size());
    uint32_t first  = crc.finalize();
    uint32_t second = crc.finalize();
    ASSERT_EQ(first, second);
}

// ------------------------------------------------------------------
//  Different data -> different checksums
// ------------------------------------------------------------------

TEST_CASE(crc32_different_data) {
    uint32_t a = CRC32::compute(std::string("alpha"));
    uint32_t b = CRC32::compute(std::string("bravo"));
    ASSERT_NE(a, b);
}

TEST_CASE(crc32_incremental_empty) {
    CRC32 crc;
    // No updates — finalize should give the empty-data checksum.
    ASSERT_EQ(crc.finalize(), (uint32_t)0x00000000);
}

RUN_ALL_TESTS()
