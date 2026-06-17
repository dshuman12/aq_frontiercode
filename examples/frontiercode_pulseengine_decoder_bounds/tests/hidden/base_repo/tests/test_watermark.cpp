#include "test_framework.hpp"
#include "pulse/window/watermark.hpp"

using namespace pulse;

TEST_CASE(wm_default_construction) {
    WatermarkTracker wm;
    ASSERT_EQ(wm.watermark(), (Timestamp)0);
    ASSERT_EQ(wm.max_observed(), (Timestamp)0);
    ASSERT_EQ(wm.late_count(), (uint64_t)0);
    ASSERT_EQ(wm.total_observed(), (uint64_t)0);
}

TEST_CASE(wm_with_tolerance) {
    WatermarkTracker wm(500);
    wm.observe(1000);
    ASSERT_EQ(wm.watermark(), (Timestamp)500);
    ASSERT_EQ(wm.max_observed(), (Timestamp)1000);
}

TEST_CASE(wm_observe_updates_max) {
    WatermarkTracker wm;
    wm.observe(100);
    ASSERT_EQ(wm.max_observed(), (Timestamp)100);
    wm.observe(500);
    ASSERT_EQ(wm.max_observed(), (Timestamp)500);
    wm.observe(300);
    ASSERT_EQ(wm.max_observed(), (Timestamp)500);
}

TEST_CASE(wm_watermark_no_tolerance) {
    WatermarkTracker wm(0);
    wm.observe(1000);
    ASSERT_EQ(wm.watermark(), (Timestamp)1000);
    wm.observe(2000);
    ASSERT_EQ(wm.watermark(), (Timestamp)2000);
}

TEST_CASE(wm_watermark_with_tolerance) {
    WatermarkTracker wm(200);
    wm.observe(1000);
    ASSERT_EQ(wm.watermark(), (Timestamp)800);
    wm.observe(1500);
    ASSERT_EQ(wm.watermark(), (Timestamp)1300);
}

TEST_CASE(wm_watermark_underflow_protection) {
    WatermarkTracker wm(5000);
    wm.observe(100);
    ASSERT_EQ(wm.watermark(), (Timestamp)0);
    wm.observe(3000);
    ASSERT_EQ(wm.watermark(), (Timestamp)0);
    wm.observe(5000);
    ASSERT_EQ(wm.watermark(), (Timestamp)0);
    wm.observe(5001);
    ASSERT_EQ(wm.watermark(), (Timestamp)1);
}

TEST_CASE(wm_is_late_detection) {
    WatermarkTracker wm(0);
    wm.observe(1000);
    ASSERT_TRUE(wm.is_late(500));
    ASSERT_TRUE(wm.is_late(999));
}

TEST_CASE(wm_not_late_above_watermark) {
    WatermarkTracker wm(100);
    wm.observe(1000);
    // watermark = 900
    ASSERT_FALSE(wm.is_late(900));
    ASSERT_FALSE(wm.is_late(950));
    ASSERT_FALSE(wm.is_late(1000));
    ASSERT_FALSE(wm.is_late(2000));
}

TEST_CASE(wm_late_count_tracking) {
    WatermarkTracker wm(0);
    wm.observe(1000);
    wm.observe(500);   // late
    wm.observe(200);   // late
    wm.observe(1500);  // not late
    wm.observe(800);   // late (watermark now 1500)
    ASSERT_EQ(wm.late_count(), (uint64_t)3);
}

TEST_CASE(wm_total_observed_count) {
    WatermarkTracker wm;
    ASSERT_EQ(wm.total_observed(), (uint64_t)0);
    wm.observe(100);
    wm.observe(200);
    wm.observe(50);
    wm.observe(300);
    ASSERT_EQ(wm.total_observed(), (uint64_t)4);
}

TEST_CASE(wm_reset_clears_state) {
    WatermarkTracker wm(100);
    wm.observe(1000);
    wm.observe(500);
    wm.observe(200);
    wm.reset();
    ASSERT_EQ(wm.watermark(), (Timestamp)0);
    ASSERT_EQ(wm.max_observed(), (Timestamp)0);
    ASSERT_EQ(wm.late_count(), (uint64_t)0);
    ASSERT_EQ(wm.total_observed(), (uint64_t)0);
}

TEST_CASE(wm_no_late_before_observe) {
    WatermarkTracker wm(0);
    ASSERT_FALSE(wm.is_late(0));
    ASSERT_FALSE(wm.is_late(100));
    ASSERT_FALSE(wm.is_late(999));
}

TEST_CASE(wm_first_event_never_late) {
    WatermarkTracker wm(0);
    wm.observe(500);
    // First event sets max to 500, watermark to 500,
    // but event_time == watermark so not strictly late
    ASSERT_EQ(wm.late_count(), (uint64_t)0);
}

TEST_CASE(wm_tolerance_window_accepts_events) {
    WatermarkTracker wm(300);
    wm.observe(1000);
    // watermark = 700
    wm.observe(750);   // 750 >= 700, not late
    wm.observe(700);   // 700 >= 700, not late
    wm.observe(699);   // 699 < 700, late
    ASSERT_EQ(wm.late_count(), (uint64_t)1);
    ASSERT_EQ(wm.total_observed(), (uint64_t)4);
}

RUN_ALL_TESTS()
