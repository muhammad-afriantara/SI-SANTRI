from typing import List, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    role: str = Field(..., description="siswa | guru | wali_murid | admin")
    identifier: str
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)


class ResetPasswordRequest(BaseModel):
    new_password: Optional[str] = Field(default=None, min_length=6)


class DailyReportIn(BaseModel):
    activity_date: str  # YYYY-MM-DD
    subuh: str
    dzuhur: str
    ashar: str
    maghrib: str
    isya: str
    sleep_window: str
    wake_window: str
    nutrition_items: Optional[List[str]] = Field(default_factory=list)
    parent_activities: Optional[List[str]] = Field(default_factory=list)
    parent_activity_custom: Optional[str] = None
    study_activities: Optional[List[str]] = Field(default_factory=list)
    study_activity_custom: Optional[str] = None


class DailyJournalV2In(BaseModel):
    activity_date: str  # YYYY-MM-DD
    subuh: Optional[str] = None
    dzuhur: Optional[str] = None
    ashar: Optional[str] = None
    maghrib: Optional[str] = None
    isya: Optional[str] = None
    belajar_items: List[str] = Field(default_factory=list)
    akhlak_items: List[str] = Field(default_factory=list)
    pengembangan_ekskul: List[str] = Field(default_factory=list)
    sleep_window: Optional[str] = None
    wake_window: Optional[str] = None
    answers: Optional[dict] = None
    proofs: Optional[List[dict]] = None
    notes: Optional[str] = None


class ParentConfirmReportIn(BaseModel):
    status: str = "confirmed"  # "confirmed" | "rejected"
    note: Optional[str] = None
    akhlak_verified: Optional[List[str]] = None


class ParentNoteIn(BaseModel):
    message: str
    activity_date: Optional[str] = None


class UploadPhotoIn(BaseModel):
    image_base64: str
    caption: Optional[str] = None


class TeacherMentoringNoteIn(BaseModel):
    category: str = "umum"  # "akademik" | "akhlak" | "ibadah" | "sosial" | "kedisiplinan" | "umum"
    note: str
    follow_up_action: Optional[str] = None


class AnnouncementIn(BaseModel):
    title: str
    content: str
    priority: str = "normal"  # "normal" | "penting" | "mendesak"





class AddStudentRequest(BaseModel):
    name: str
    nipd: str
    class_id: str
    teacher_id: Optional[str] = None


class UpdateStudentRequest(BaseModel):
    name: Optional[str] = None
    class_id: Optional[str] = None
    teacher_id: Optional[str] = None
    is_active: Optional[bool] = None


class AdminAddTeacherRequest(BaseModel):
    name: str
    username: Optional[str] = None


class AdminAddClassRequest(BaseModel):
    name: str

