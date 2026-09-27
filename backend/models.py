from typing import List, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    role: str = Field(..., description="siswa | guru | wali_murid")
    identifier: str
    password: str


class DailyReportIn(BaseModel):
    activity_date: str  # YYYY-MM-DD
    subuh: str
    dzuhur: str
    ashar: str
    maghrib: str
    isya: str
    sleep_window: str
    wake_window: str
    nutrition_items: List[str]
    parent_activities: List[str]
    parent_activity_custom: Optional[str] = None
    study_activities: List[str]
    study_activity_custom: Optional[str] = None


class AddStudentRequest(BaseModel):
    name: str
    nipd: str
    class_id: str
    teacher_id: Optional[str] = None
