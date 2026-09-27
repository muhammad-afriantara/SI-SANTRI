from datetime import timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from database import db, DEFAULT_PASSWORD
from models import AddStudentRequest
from auth_utils import require_role, now_jakarta, today_jakarta_str, normalize_identifier, hash_password

router = APIRouter(prefix="/api/teacher", tags=["teacher"])


def clean_report(doc):
    if not doc:
        return None
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


async def get_teacher(user: dict) -> dict:
    teacher = await db.teachers.find_one({"_id": user["ref_id"]})
    if not teacher:
        raise HTTPException(status_code=404, detail="Data guru tidak ditemukan")
    return teacher


async def get_owned_student(teacher_id: str, student_id: str) -> dict:
    student = await db.students.find_one({"_id": student_id})
    if not student or student["teacher_id"] != teacher_id:
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke siswa ini")
    return student


@router.get("/dashboard")
async def dashboard(date: str = Query(None), user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    target_date = date or today_jakarta_str()

    total = await db.students.count_documents({"teacher_id": teacher["_id"]})
    students = await db.students.find({"teacher_id": teacher["_id"]}).to_list(500)
    student_ids = [s["_id"] for s in students]
    submitted = await db.daily_reports.count_documents({
        "student_id": {"$in": student_ids}, "activity_date": target_date
    })
    pending = total - submitted
    percentage = round((submitted / total) * 100, 1) if total else 0.0

    return {
        "teacher": {"teacher_id": teacher["_id"], "name": teacher["name"]},
        "date": target_date,
        "total_students": total,
        "submitted_today": submitted,
        "pending_today": pending,
        "percentage": percentage,
    }


@router.get("/students")
async def list_students(
    date: str = Query(None),
    status: str = Query("semua"),
    search: str = Query(""),
    user: dict = Depends(require_role("guru")),
):
    teacher = await get_teacher(user)
    target_date = date or today_jakarta_str()

    query = {"teacher_id": teacher["_id"]}
    if search.strip():
        query["$or"] = [
            {"name": {"$regex": search.strip(), "$options": "i"}},
            {"nipd": {"$regex": search.strip(), "$options": "i"}},
        ]
    students = await db.students.find(query).sort("name", 1).to_list(500)
    student_ids = [s["_id"] for s in students]

    reports = await db.daily_reports.find(
        {"student_id": {"$in": student_ids}, "activity_date": target_date}
    ).to_list(len(student_ids) or 1)
    reports_by_student = {r["student_id"]: r for r in reports}

    result = []
    for s in students:
        report = reports_by_student.get(s["_id"])
        filled = report is not None
        if status == "sudah" and not filled:
            continue
        if status == "belum" and filled:
            continue
        result.append({
            "student_id": s["_id"],
            "name": s["name"],
            "nipd": s["nipd"],
            "class_id": s["class_id"],
            "filled": filled,
            "submitted_late": report.get("submitted_late", False) if report else False,
        })
    return result


async def compute_recap(student_id: str, days: int) -> dict:
    end_date = now_jakarta().date()
    start_date = end_date - timedelta(days=days - 1)
    reports = await db.daily_reports.find({
        "student_id": student_id,
        "activity_date": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()},
    }).to_list(days)

    submitted_count = len(reports)
    berjamaah_slots = 0
    total_slots = 0
    for report in reports:
        for waktu in ["subuh", "dzuhur", "ashar", "maghrib", "isya"]:
            total_slots += 1
            if report.get(waktu) == "jamaah":
                berjamaah_slots += 1

    return {
        "days": days,
        "submitted_count": submitted_count,
        "submission_rate": round((submitted_count / days) * 100, 1) if days else 0.0,
        "prayer_berjamaah_rate": round((berjamaah_slots / total_slots) * 100, 1) if total_slots else 0.0,
    }


@router.get("/students/{student_id}")
async def student_detail(student_id: str, date: str = Query(None), user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    student = await get_owned_student(teacher["_id"], student_id)
    target_date = date or today_jakarta_str()

    report = await db.daily_reports.find_one({"student_id": student_id, "activity_date": target_date})
    recap_7 = await compute_recap(student_id, 7)
    recap_30 = await compute_recap(student_id, 30)

    return {
        "student": {
            "student_id": student["_id"],
            "name": student["name"],
            "nipd": student["nipd"],
            "class_id": student["class_id"],
            "teacher_name": student["teacher_name"],
        },
        "date": target_date,
        "report": clean_report(report),
        "recap_7_days": recap_7,
        "recap_30_days": recap_30,
    }


@router.get("/students/{student_id}/reports")
async def student_reports(student_id: str, user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    await get_owned_student(teacher["_id"], student_id)
    reports = await db.daily_reports.find({"student_id": student_id}).sort("activity_date", -1).to_list(500)
    return [clean_report(r) for r in reports]


@router.post("/students")
async def add_student(body: AddStudentRequest, user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    target_teacher_id = body.teacher_id or teacher["_id"]

    existing_nipd = await db.students.find_one({"nipd": body.nipd.strip()})
    if existing_nipd:
        raise HTTPException(status_code=400, detail="NIPD sudah terdaftar")

    class_doc = await db.classes.find_one({"_id": body.class_id})
    if not class_doc:
        raise HTTPException(status_code=400, detail="Kelas tidak ditemukan")

    target_teacher = await db.teachers.find_one({"_id": target_teacher_id})
    if not target_teacher:
        raise HTTPException(status_code=400, detail="Guru wali tidak ditemukan")

    student_id = f"S{uuid.uuid4().hex[:8].upper()}"
    parent_id = f"P{uuid.uuid4().hex[:8].upper()}"
    child_username = normalize_identifier(body.name)
    password_hash = hash_password(DEFAULT_PASSWORD)
    created_at = now_jakarta()

    await db.students.insert_one({
        "_id": student_id,
        "name": body.name.strip(),
        "nipd": body.nipd.strip(),
        "class_id": body.class_id,
        "teacher_id": target_teacher_id,
        "teacher_name": target_teacher["name"],
    })
    await db.parents.insert_one({
        "_id": parent_id,
        "name": f"Wali dari {body.name.strip()}",
        "student_id": student_id,
    })
    await db.users.insert_many([
        {
            "_id": f"U_{student_id}",
            "role": "siswa",
            "username": None,
            "nipd": body.nipd.strip(),
            "password_hash": password_hash,
            "display_name": body.name.strip(),
            "ref_id": student_id,
            "is_active": True,
            "created_at": created_at,
        },
        {
            "_id": f"U_{parent_id}",
            "role": "wali_murid",
            "username": child_username,
            "nipd": None,
            "password_hash": password_hash,
            "display_name": f"Wali dari {body.name.strip()}",
            "ref_id": parent_id,
            "is_active": True,
            "created_at": created_at,
        },
    ])

    return {
        "student_id": student_id,
        "name": body.name.strip(),
        "nipd": body.nipd.strip(),
        "class_id": body.class_id,
        "teacher_name": target_teacher["name"],
        "login_siswa": {"nipd": body.nipd.strip(), "password": DEFAULT_PASSWORD},
        "login_wali_murid": {"username": child_username, "password": DEFAULT_PASSWORD},
    }
