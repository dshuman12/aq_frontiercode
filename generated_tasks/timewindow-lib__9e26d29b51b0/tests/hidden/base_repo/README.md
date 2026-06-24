# timewindow

Small utility library for aligning timezone-aware datetimes to fixed-width UTC buckets. Handy when you are bucketing metrics, log lines, or traces before rollups.

## Install

```bash
pip install -e ".[dev]"
```

## Usage

```python
from datetime import datetime, timezone
from timewindow import floor_to_bucket, ceil_to_bucket

ts = datetime(2026, 5, 1, 17, 42, 9, tzinfo=timezone.utc)
start = floor_to_bucket(ts, 3600)   # 2026-05-01 17:00:00+00:00
end = ceil_to_bucket(ts, 3600)      # 2026-05-01 18:00:00+00:00
```

All inputs must be timezone-aware; naive datetimes raise `ValueError`.

`bucket_seconds` should evenly divide common day lengths if you care about calendar-day alignment — the math itself is pure epoch seconds.
