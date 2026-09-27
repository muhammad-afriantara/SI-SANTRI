from fastapi import APIRouter, Depends, HTTPException, Query

from database import db
from auth_utils import require_role, today_jakarta_str
from routes.teacher import compute_recap

router = APIRouter(prefix="/api/parent", tags=["parent"])


def clean_report(doc):
    if not doc:
        return None
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


async def get_child(user: dict) -> dict:
    parent = await db.parents.find_one({"_id": user["ref_id"]})
    if not parent:
        raise HTTPException(status_code=404, detail="Data wali murid tidak ditemukan")
    student = await db.students.find_one({"_id": parent["student_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Data siswa tidak ditemukan")
    return student


@router.get("/dashboard")
async def dashboard(user: dict = Depends(require_role("wali_murid"))):
    student = await get_child(user)
    today = today_jakarta_str()
    today_report = await db.daily_reports.find_one({"student_id": student["_id"], "activity_date": today})

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
        "today_report": clean_report(today_report),
    }


@router.get("/reports")
async def list_reports(user: dict = Depends(require_role("wali_murid"))):
    student = await get_child(user)
    reports = await db.daily_reports.find({"student_id": student["_id"]}).sort("activity_date", -1).to_list(500)
    return [clean_report(r) for r in reports]


@router.get("/summary")
async def summary(days: int = Query(7), user: dict = Depends(require_role("wali_murid"))):
    student = await get_child(user)
    if days not in (7, 30):
        days = 7
    return await compute_recap(student["_id"], days)
