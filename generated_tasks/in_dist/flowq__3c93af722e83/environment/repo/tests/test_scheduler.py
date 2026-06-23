"""Tests for flowq/scheduler.py — CronField, CronExpression, Scheduler."""

import pytest
from datetime import datetime
from flowq.scheduler import CronField, CronExpression, ScheduledJob, Scheduler
from flowq.exceptions import SchedulerError


# ── CronField ─────────────────────────────────────────────────────────────

def test_wildcard_matches_all_minutes():
    f = CronField("*", "minute")
    assert all(f.matches(i) for i in range(60))


def test_single_value_matches_only_itself():
    f = CronField("30", "minute")
    assert f.matches(30)
    assert not f.matches(29)


def test_range_matches_inclusive():
    f = CronField("1-5", "hour")
    assert all(f.matches(i) for i in range(1, 6))
    assert not f.matches(0) and not f.matches(6)


def test_step_every_15_minutes():
    f = CronField("*/15", "minute")
    assert {0, 15, 30, 45}.issubset(f.values)


def test_comma_list():
    f = CronField("1,3,5", "weekday")
    assert f.values == {1, 3, 5}


def test_invalid_value_raises():
    with pytest.raises(SchedulerError):
        CronField("99", "minute")


def test_invalid_range_raises():
    with pytest.raises(SchedulerError):
        CronField("10-5", "hour")


# ── CronExpression ─────────────────────────────────────────────────────────

def test_wrong_field_count_raises():
    with pytest.raises(SchedulerError):
        CronExpression("* * * *")


def test_matches_exact_time():
    expr = CronExpression("30 9 * * *")
    dt = datetime(2024, 1, 15, 9, 30)
    assert expr.matches(dt)


def test_does_not_match_wrong_minute():
    expr = CronExpression("30 9 * * *")
    assert not expr.matches(datetime(2024, 1, 15, 9, 31))


def test_next_run_is_in_future():
    expr = CronExpression("* * * * *")   # every minute
    after = datetime(2024, 6, 1, 12, 0)
    nxt = expr.next_run(after=after)
    assert nxt > after


def test_next_run_daily():
    expr = CronExpression("0 2 * * *")  # 02:00 every day
    after = datetime(2024, 1, 1, 1, 0)
    nxt = expr.next_run(after=after)
    assert nxt.hour == 2 and nxt.minute == 0


# ── Scheduler ──────────────────────────────────────────────────────────────

def test_tick_fires_matching_job():
    scheduler = Scheduler()
    fired = []
    sj = ScheduledJob(
        name="test", cron="30 9 * * *",
        job_factory=lambda: {},
    )
    scheduler.add(sj)
    fired = scheduler.tick(now=datetime(2024, 1, 15, 9, 30))
    assert sj.id in fired


def test_tick_does_not_fire_non_matching():
    scheduler = Scheduler()
    sj = ScheduledJob(name="test", cron="0 0 * * *", job_factory=lambda: {})
    scheduler.add(sj)
    fired = scheduler.tick(now=datetime(2024, 1, 15, 9, 30))
    assert fired == []


def test_remove_stops_firing():
    scheduler = Scheduler()
    sj = ScheduledJob(name="test", cron="* * * * *", job_factory=lambda: {})
    scheduler.add(sj)
    scheduler.remove(sj.id)
    assert scheduler.tick(now=datetime(2024, 1, 1, 0, 0)) == []


def test_disabled_job_does_not_fire():
    scheduler = Scheduler()
    sj = ScheduledJob(name="test", cron="* * * * *", job_factory=lambda: {}, enabled=False)
    scheduler.add(sj)
    assert scheduler.tick(now=datetime(2024, 1, 1, 0, 0)) == []


def test_last_run_updated_after_tick():
    scheduler = Scheduler()
    sj = ScheduledJob(name="test", cron="* * * * *", job_factory=lambda: {})
    scheduler.add(sj)
    now = datetime(2024, 5, 1, 10, 0)
    scheduler.tick(now=now)
    assert sj.last_run == now
