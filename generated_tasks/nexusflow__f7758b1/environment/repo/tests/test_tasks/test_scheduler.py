"""Tests for nexusflow.tasks.scheduler."""

import pytest

from nexusflow.tasks.scheduler import (
    CronExpression,
    CronField,
    ScheduledTask,
    TaskScheduler,
    TaskStatus,
)


class TestCronExpression:
    """Tests for parsing and matching cron expressions."""

    def test_every_minute(self):
        cron = CronExpression("* * * * *")
        assert cron.minute.matches(0) is True
        assert cron.minute.matches(30) is True

    def test_specific_time(self):
        cron = CronExpression("30 9 * * *")
        assert cron.matches(30, 9, 1, 1, 0) is True
        assert cron.matches(0, 9, 1, 1, 0) is False

    def test_step_values(self):
        cron = CronExpression("*/15 * * * *")
        assert cron.minute.matches(0) is True
        assert cron.minute.matches(15) is True
        assert cron.minute.matches(30) is True
        assert cron.minute.matches(10) is False

    def test_range(self):
        cron = CronExpression("0 9-17 * * *")
        assert cron.hour.matches(9) is True
        assert cron.hour.matches(17) is True
        assert cron.hour.matches(20) is False

    def test_invalid_expression_raises(self):
        with pytest.raises(ValueError, match="Invalid cron"):
            CronExpression("* *")


class TestCronField:
    """Tests for individual cron field parsing."""

    def test_wildcard(self):
        field = CronField("*", 0, 59)
        assert field.matches(0) is True
        assert field.matches(59) is True

    def test_comma_list(self):
        field = CronField("1,5,10", 0, 59)
        assert field.matches(1) is True
        assert field.matches(5) is True
        assert field.matches(3) is False

    def test_next_match(self):
        field = CronField("10,20,30", 0, 59)
        assert field.next_match(15) == 20
        assert field.next_match(31) is None


class TestTaskScheduler:
    """Tests for the TaskScheduler."""

    def test_schedule_interval(self):
        scheduler = TaskScheduler()
        calls = []
        task_id = scheduler.schedule_interval(
            "tick", lambda: calls.append(1), interval_seconds=10
        )
        assert task_id in scheduler._tasks

    def test_schedule_cron(self):
        scheduler = TaskScheduler()
        task_id = scheduler.schedule_cron(
            "daily", lambda: None, cron_expr="0 0 * * *"
        )
        task = scheduler._tasks[task_id]
        assert task.name == "daily"
        assert task.status == TaskStatus.PENDING

    def test_get_task(self):
        scheduler = TaskScheduler()
        task_id = scheduler.schedule_interval("tick", lambda: None, interval_seconds=5)
        task = scheduler.get_task(task_id)
        assert task is not None
        assert task.name == "tick"

    def test_get_nonexistent_task(self):
        scheduler = TaskScheduler()
        assert scheduler.get_task("nope") is None
