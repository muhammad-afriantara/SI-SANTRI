import uuid
from datetime import timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query

from database import db
from models import ParentConfirmReportIn, ParentNoteIn
from auth_utils import require_role, today_jakarta_str, now_jakarta
from routes.teacher import compute_recap
from services.scoring import calculate_v1_legacy_score

router = APIRouter(prefix="/api/parent", tags=["parent"])


def clean_report(doc):
    if not doc:
        return None
    d = dict(doc)
    d.pop("_id", None)
    if "scores" not in d:
        d["scores"] = calculate_v1_legacy_score(d)
    if "parent_confirmation" not in d:
        has_akhlak = bool(d.get("akhlak_items") or d.get("parent_activities"))
        d["parent_confirmation"] = {
            "status": "pending" if has_akhlak else "not_required",
            "confirmed_by": None,
            "confirmed_at": None,
            "parent_note": None,
        }
    return d


async def get_parent_and_child(user: dict) -> tuple[dict, dict]:
    parent = await db.parents.find_one({"_id": user["ref_id"]})
    if not parent:
        raise HTTPException(status_code=404, detail="Data wali murid tidak ditemukan")
    student = await db.students.find_one({"_id": parent["student_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Data siswa tidak ditemukan")
    return parent, student


async def get_child(user: dict) -> dict:
    _, student = await get_parent_and_child(user)
    return student


@router.get("/dashboard")
async def dashboard(user: dict = Depends(require_role("wali_murid"))):
    parent, student = await get_parent_and_child(user)
    today = today_jakarta_str()
    today_report = await db.daily_reports.find_one({"student_id": student["_id"], "activity_date": today})

    # Hitung jumlah laporan yang menunggu konfirmasi (14 hari terakhir)
    fourteen_days_ago = (now_jakarta().date() - timedelta(days=13)).isoformat()
    recent_reports = await db.daily_reports.find({
        "student_id": student["_id"],
        "activity_date": {"$gte": fourteen_days_ago, "$lte": today},
    }).to_list(14)

    pending_confirmations = 0
    for r in recent_reports:
        conf = r.get("parent_confirmation")
        status = conf.get("status") if conf else "pending"
        has_akhlak = bool(r.get("akhlak_items") or r.get("parent_activities"))
        if has_akhlak and status == "pending":
            pending_confirmations += 1

    # Ambil catatan motivasi terakhir yang diberikan orang tua
    latest_note = await db.parent_notes.find_one(
        {"student_id": student["_id"]},
        sort=[("created_at", -1)],
    )
    if latest_note:
        latest_note.pop("_id", None)

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
        "pending_confirmations_count": pending_confirmations,
        "latest_note": latest_note,
    }


@router.get("/confirmations")
async def list_confirmations(user: dict = Depends(require_role("wali_murid"))):
    _, student = await get_parent_and_child(user)
    fourteen_days_ago = (now_jakarta().date() - timedelta(days=13)).isoformat()
    reports = await db.daily_reports.find({
        "student_id": student["_id"],
        "activity_date": {"$gte": fourteen_days_ago},
    }).sort("activity_date", -1).to_list(14)

    items = []
    for r in reports:
        cleaned = clean_report(r)
        items.append({
            "activity_date": cleaned["activity_date"],
            "scores": cleaned.get("scores"),
            "akhlak_items": cleaned.get("akhlak_items") or cleaned.get("parent_activities") or [],
            "proofs": cleaned.get("proofs") or [],
            "notes": cleaned.get("notes"),
            "parent_confirmation": cleaned.get("parent_confirmation"),
        })
    return items


@router.post("/reports/{activity_date}/confirm")
async def confirm_report(
    activity_date: str,
    body: ParentConfirmReportIn,
    user: dict = Depends(require_role("wali_murid")),
):
    parent, student = await get_parent_and_child(user)
    report = await db.daily_reports.find_one({"student_id": student["_id"], "activity_date": activity_date})
    if not report:
        raise HTTPException(status_code=404, detail="Laporan tanggal tersebut tidak ditemukan")

    conf_data = {
        "status": body.status,
        "confirmed_by": parent.get("name") or user.get("display_name", "Orang Tua"),
        "confirmed_at": now_jakarta().isoformat(),
        "parent_note": body.note,
        "akhlak_verified": body.akhlak_verified or report.get("akhlak_items") or report.get("parent_activities") or [],
    }

    await db.daily_reports.update_one(
        {"_id": report["_id"]},
        {"$set": {"parent_confirmation": conf_data, "updated_at": now_jakarta()}},
    )
    return {"ok": True, "message": "Konfirmasi berhasil disimpan", "parent_confirmation": conf_data}


@router.get("/notes")
async def list_notes(user: dict = Depends(require_role("wali_murid"))):
    _, student = await get_parent_and_child(user)
    notes = await db.parent_notes.find({"student_id": student["_id"]}).sort("created_at", -1).to_list(50)
    for n in notes:
        n["id"] = str(n.pop("_id"))
    return notes


@router.post("/notes")
async def create_note(body: ParentNoteIn, user: dict = Depends(require_role("wali_murid"))):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Pesan catatan tidak boleh kosong")

    parent, student = await get_parent_and_child(user)
    now = now_jakarta()
    note_doc = {
        "_id": f"PN_{uuid.uuid4().hex[:12]}",
        "parent_id": parent["_id"],
        "parent_name": parent.get("name", "Orang Tua"),
        "student_id": student["_id"],
        "message": body.message.strip(),
        "activity_date": body.activity_date or today_jakarta_str(),
        "created_at": now.isoformat(),
    }
    await db.parent_notes.insert_one(note_doc)
    doc_copy = dict(note_doc)
    doc_copy["id"] = doc_copy.pop("_id")
    return {"ok": True, "message": "Catatan motivasi berhasil dikirim", "note": doc_copy}


@router.get("/child-progress")
async def child_progress(days: int = Query(7), user: dict = Depends(require_role("wali_murid"))):
    _, student = await get_parent_and_child(user)
    if days not in (7, 14, 30):
        days = 7

    end_date = now_jakarta().date()
    start_date = end_date - timedelta(days=days - 1)

    reports = await db.daily_reports.find({
        "student_id": student["_id"],
        "activity_date": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()},
    }).sort("activity_date", -1).to_list(days)

    reports_by_date = {r["activity_date"]: r for r in reports}
    timeline = []
    category_totals = {"ibadah": 0, "belajar": 0, "akhlak": 0, "pengembangan": 0}
    total_scores = []

    for i in range(days):
        d = start_date + timedelta(days=i)
        d_str = d.isoformat()
        rep = reports_by_date.get(d_str)
        if rep:
            sc = rep.get("scores") or calculate_v1_legacy_score(rep)
            total_scores.append(sc.get("total", 0))
            for cat in category_totals:
                category_totals[cat] += sc.get(cat, 0)
            timeline.append({
                "date": d_str,
                "filled": True,
                "total_score": sc.get("total", 0),
                "max_score": sc.get("max", 87),
                "percentage": sc.get("percentage", 0),
                "scores": sc,
                "parent_confirmation": rep.get("parent_confirmation"),
            })
        else:
            timeline.append({
                "date": d_str,
                "filled": False,
                "total_score": 0,
                "max_score": 87,
                "percentage": 0,
                "scores": None,
            })

    filled_days = len(reports)
    avg_total = round(sum(total_scores) / filled_days, 1) if filled_days else 0.0

    return {
        "days": days,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "filled_count": filled_days,
        "submission_rate": round((filled_days / days) * 100, 1),
        "average_score": avg_total,
        "category_averages": {
            k: round(v / filled_days, 1) if filled_days else 0.0
            for k, v in category_totals.items()
        },
        "timeline": timeline,
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


@router.get("/announcements")
async def parent_announcements(user: dict = Depends(require_role("wali_murid"))):
    student = await get_child(user)
    announcements = await db.announcements.find({
        "$or": [{"class_id": student["class_id"]}, {"class_id": "Semua"}]
    }).sort("created_at", -1).to_list(20)
    for a in announcements:
        a["id"] = str(a.pop("_id"))
    return announcements


