from __future__ import annotations

from datetime import datetime, timezone
from pydantic import BaseModel, Field
    
class Timestamped(BaseModel):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))