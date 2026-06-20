from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.database.database import Base

class Violation(Base):
    __tablename__ = "violations"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    interview_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    student_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    type = Column(
        String,
        nullable=False
    )

    duration = Column(
        Float,
        nullable=True
    )

    confidence = Column(
        Float,
        default=0
    )

    timestamp = Column(
        DateTime,
        default=datetime.utcnow
    )