from datetime import timedelta
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException

from database import db
from models import DailyReportIn
from auth_utils import require_role, now_jakarta, today_jakarta_str

router = APIRouter(prefix="/api/student", tags=["student"])


def clean_report(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


async def get_student(user: dict) -> dict:
    student = await db.students.find_one({"_id": user["ref_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Data siswa tidak ditemukan")
    return student


@router.get("/dashboard")
async def dashboard(user: dict = Depends(require_role("siswa"))):
    student = await get_student(user)
    today = today_jakarta_str()

    today_report = await db.daily_reports.find_one({"student_id": student["_id"], "activity_date": today})

    missed_dates = []
    for i in range(1, 8):
        check_date = (now_jakarta().date() - timedelta(days=i)).isoformat()
        exists = await db.daily_reports.find_one({"student_id": student["_id"], "activity_date": check_date})
        if not exists:
            missed_dates.append(check_date)
    missed_dates.sort(reverse=True)

    return {
        "student": {
            "student_id": student["_id"],
            "name": student["name"],
            "nipd": student["nipd"],
            "class_id": student["class_id"],
            "teacher_name": student["teacher_name"],
        },
        "today_date": today,
        "today_filled": today_report is not None,
        "today_report": clean_report(today_report) if today_report else None,
        "missed_dates": missed_dates,
    }


@router.get("/reports")
async def list_reports(user: dict = Depends(require_role("siswa"))):
    student = await get_student(user)
    reports = await db.daily_reports.find({"student_id": student["_id"]}).sort("activity_date", -1).to_list(500)
    return [clean_report(r) for r in reports]


@router.get("/reports/{activity_date}")
async def get_report(activity_date: str, user: dict = Depends(require_role("siswa"))):
    student = await get_student(user)
    report = await db.daily_reports.find_one({"student_id": student["_id"], "activity_date": activity_date})
    if not report:
        return None
    return clean_report(report)


@router.post("/reports")
async def upsert_report(body: DailyReportIn, user: dict = Depends(require_role("siswa"))):
    student = await get_student(user)
    today = today_jakarta_str()

    if body.activity_date > today:
        raise HTTPException(status_code=400, detail="Tidak boleh mengisi tanggal masa depan")

    if not body.nutrition_items:
        raise HTTPException(status_code=400, detail="Pilih minimal 1 kandungan menu makanan")
    if not body.parent_activities:
        raise HTTPException(status_code=400, detail="Pilih minimal 1 kegiatan bersama orang tua")
    if not body.study_activities:
        raise HTTPException(status_code=400, detail="Pilih minimal 1 aktivitas belajar")
    if "Lainnya" in body.parent_activities and not (body.parent_activity_custom or "").strip():
        raise HTTPException(status_code=400, detail="Isi keterangan kegiatan orang tua lainnya")
    if "Kegiatan non akademik lainnya" in body.study_activities and not (body.study_activity_custom or "").strip():
        raise HTTPException(status_code=400, detail="Isi keterangan kegiatan belajar lainnya")

    now = now_jakarta()
    submitted_late = today > body.activity_date

    existing = await db.daily_reports.find_one({"student_id": student["_id"], "activity_date": body.activity_date})

    payload = body.dict()
    payload["student_id"] = student["_id"]
    payload["updated_at"] = now
    payload["submitted_late"] = submitted_late

    if existing:
        await db.daily_reports.update_one({"_id": existing["_id"]}, {"$set": payload})
        saved = await db.daily_reports.find_one({"_id": existing["_id"]})
    else:
        payload["_id"] = str(uuid.uuid4())
        payload["submitted_at"] = now
        await db.daily_reports.insert_one(payload)
        saved = payload

    return clean_report(saved)
