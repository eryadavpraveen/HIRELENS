from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from sqlalchemy import String

from app.database.database import Base

class Participant(Base):
    __tablename__ = "participants"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    verification_photo = Column(
        String,
        nullable=True
    )

    interview_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    student_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    joined_at = Column(
        DateTime,
        default=datetime.utcnow
    )