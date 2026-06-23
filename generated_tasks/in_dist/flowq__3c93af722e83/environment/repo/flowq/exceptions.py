"""Custom exceptions for FlowQ."""


class FlowQError(Exception):
    """Base exception for all FlowQ errors."""


class JobNotFoundError(FlowQError):
    def __init__(self, job_id: str):
        self.job_id = job_id
        super().__init__(f"Job not found: {job_id}")


class InvalidStatusTransitionError(FlowQError):
    def __init__(self, from_status: str, to_status: str):
        self.from_status = from_status
        self.to_status = to_status
        super().__init__(f"Cannot transition job from '{from_status}' to '{to_status}'")


class QueueFullError(FlowQError):
    def __init__(self, capacity: int):
        self.capacity = capacity
        super().__init__(f"Queue is full (capacity={capacity})")


class DuplicateJobError(FlowQError):
    def __init__(self, job_id: str):
        self.job_id = job_id
        super().__init__(f"Job already exists: {job_id}")


class RetryExhaustedError(FlowQError):
    def __init__(self, job_id: str, max_retries: int):
        self.job_id = job_id
        self.max_retries = max_retries
        super().__init__(f"Job {job_id} exhausted all {max_retries} retry attempts")


class SchedulerError(FlowQError):
    """Raised for invalid cron expressions or scheduler misconfigurations."""


class StorageError(FlowQError):
    """Raised when a persistence operation fails."""
