from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.database.database import Base

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    title = Column(String, nullable=False)

    description = Column(String)

    recruiter_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    status = Column(
        String,
        default="scheduled"
    )

    start_time = Column(DateTime)

    end_time = Column(DateTime)

    completed_at = Column(DateTime, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )