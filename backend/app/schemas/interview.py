from pydantic import BaseModel
from datetime import datetime


class InterviewJoinPreview(BaseModel):
    """Safe fields exposed to students before they join an interview."""

    id: str
    title: str
    description: str | None = None
    status: str
    start_time: datetime | None = None
    end_time: datetime | None = None


class InterviewCreate(BaseModel):
    title: str
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None


class InterviewComplete(BaseModel):
    reason: str | None = "RECRUITER"