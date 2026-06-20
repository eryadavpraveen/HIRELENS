from pydantic import BaseModel

class ViolationCreate(BaseModel):
    interview_id: str
    student_id: str
    type: str
    duration: float | None = None
    confidence: float = 0.0