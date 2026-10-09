from datetime import timedelta
from typing import Optional, Union
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from database import db
from models import DailyReportIn, DailyJournalV2In, UploadPhotoIn
from auth_utils import require_role, now_jakarta, today_jakarta_str
from services.scoring import (
    calculate_daily_journal_scores,
    calculate_v1_legacy_score,
)
from services.badges import evaluate_student_badges, get_student_badges_progress

router = APIRouter(prefix="/api/student", tags=["student"])


def clean_report(doc: dict) -> dict:
    if not doc:
        return None
    d = dict(doc)
    d.pop("_id", None)
    # Jika belum ada field scores (dokumen v1 lama), hitung otomatis
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


async def get_student(user: dict) -> dict:
    student = await db.students.find_one({"_id": user["ref_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Data siswa tidak ditemukan")
    return student


async def cleanup_expired_proofs() -> int:
    """Hapus otomatis foto bukti kegiatan yang sudah lebih dari 7 hari untuk menghemat kuota MongoDB Atlas."""
    seven_days_ago = (now_jakarta().date() - timedelta(days=7)).isoformat()
    try:
        res = await db.daily_reports.update_many(
            {"activity_date": {"$lt": seven_days_ago}, "proofs": {"$exists": True, "$ne": []}},
            {"$set": {"proofs": []}}
        )
        return res.modified_count
    except Exception:
        return 0


@router.get("/dashboard")
async def dashboard(user: dict = Depends(require_role("siswa"))):
    student = await get_student(user)
    today = today_jakarta_str()

    # Jalankan pembersihan foto kadaluarsa (> 7 hari) secara pasif
    await cleanup_expired_proofs()

    today_report = await db.daily_reports.find_one({"student_id": student["_id"], "activity_date": today})

    # Ambil 7 hari sebelumnya dalam 1 query batch kilat (bukan 7 kali query berturut-turut)
    start_7_check = (now_jakarta().date() - timedelta(days=7)).isoformat()
    recent_filled = await db.daily_reports.find(
        {"student_id": student["_id"], "activity_date": {"$gte": start_7_check, "$lt": today}},
        {"activity_date": 1}
    ).to_list(10)
    filled_dates_set = set(r["activity_date"] for r in recent_filled)

    missed_dates = [
        (now_jakarta().date() - timedelta(days=i)).isoformat()
        for i in range(1, 8)
        if (now_jakarta().date() - timedelta(days=i)).isoformat() not in filled_dates_set
    ]
    missed_dates.sort(reverse=True)

    # Hitung rata-rata skor 7 hari terakhir
    start_7 = (now_jakarta().date() - timedelta(days=6)).isoformat()
    last_7_reports = await db.daily_reports.find({
        "student_id": student["_id"],
        "activity_date": {"$gte": start_7, "$lte": today},
    }).to_list(7)

    scores_7 = []
    berjamaah_count = 0
    total_slots = 0
    for r in last_7_reports:
        sc = r.get("scores") or calculate_v1_legacy_score(r)
        scores_7.append(sc.get("total", 0))
        for w in ["subuh", "dzuhur", "ashar", "maghrib", "isya"]:
            total_slots += 1
            if r.get(w) == "jamaah":
                berjamaah_count += 1

    avg_score_7 = round(sum(scores_7) / len(scores_7), 1) if scores_7 else 0.0
    prayer_rate_7 = round((berjamaah_count / total_slots) * 100, 1) if total_slots else 0.0

    # Ambil catatan motivasi terakhir dari orang tua
    latest_parent_note = await db.parent_notes.find_one(
        {"student_id": student["_id"]},
        sort=[("created_at", -1)],
    )
    if latest_parent_note:
        latest_parent_note.pop("_id", None)

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
        "latest_parent_note": latest_parent_note,
        "summary": {
            "avg_score_7_days": avg_score_7,
            "prayer_rate_7_days": prayer_rate_7,
            "filled_count_7_days": len(last_7_reports),
        },
    }


@router.get("/progress")
async def progress(days: int = Query(7), user: dict = Depends(require_role("siswa"))):
    student = await get_student(user)
    if days not in (7, 14, 30):
        days = 7

    end_date = now_jakarta().date()
    start_date = end_date - timedelta(days=days - 1)

    reports = await db.daily_reports.find({
        "student_id": student["_id"],
        "activity_date": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()},
    }).sort("activity_date", 1).to_list(days)

    reports_by_date = {r["activity_date"]: r for r in reports}

    timeline = []
    total_scores = []
    category_totals = {"ibadah": 0, "belajar": 0, "akhlak": 0, "pengembangan": 0}

    for i in range(days):
        d_str = (start_date + timedelta(days=i)).isoformat()
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


@router.post("/journal")
@router.post("/reports")
async def upsert_journal(body: Union[DailyJournalV2In, DailyReportIn], user: dict = Depends(require_role("siswa"))):
    student = await get_student(user)
    today = today_jakarta_str()

    if body.activity_date > today:
        raise HTTPException(status_code=400, detail="Tidak boleh mengisi tanggal masa depan")

    now = now_jakarta()
    submitted_late = today > body.activity_date

    # Deteksi apakah payload v2 atau v1
    if isinstance(body, DailyJournalV2In) or hasattr(body, "belajar_items"):
        if getattr(body, "answers", None):
            answers = body.answers
            ib = answers.get("ibadah", {})
            subuh = ib.get("subuh", body.subuh or "tidak_sholat")
            dzuhur = ib.get("dzuhur", body.dzuhur or "tidak_sholat")
            ashar = ib.get("ashar", body.ashar or "tidak_sholat")
            maghrib = ib.get("maghrib", body.maghrib or "tidak_sholat")
            isya = ib.get("isya", body.isya or "tidak_sholat")
            belajar_items = answers.get("belajar", body.belajar_items or [])
            akhlak_items = answers.get("akhlak", body.akhlak_items or [])
            peng = answers.get("pengembangan", {})
            pengembangan_ekskul = peng.get("ekskul", body.pengembangan_ekskul or [])
            sleep_window = peng.get("sleep_window", body.sleep_window or "")
            wake_window = peng.get("wake_window", body.wake_window or "")
        else:
            subuh = body.subuh or "tidak_sholat"
            dzuhur = body.dzuhur or "tidak_sholat"
            ashar = body.ashar or "tidak_sholat"
            maghrib = body.maghrib or "tidak_sholat"
            isya = body.isya or "tidak_sholat"
            belajar_items = body.belajar_items or []
            akhlak_items = body.akhlak_items or []
            pengembangan_ekskul = body.pengembangan_ekskul or []
            sleep_window = body.sleep_window or ""
            wake_window = body.wake_window or ""
            answers = {
                "ibadah": {
                    "subuh": subuh,
                    "dzuhur": dzuhur,
                    "ashar": ashar,
                    "maghrib": maghrib,
                    "isya": isya,
                },
                "belajar": belajar_items,
                "akhlak": akhlak_items,
                "pengembangan": {
                    "ekskul": pengembangan_ekskul,
                    "sleep_window": sleep_window,
                    "wake_window": wake_window,
                },
            }

        scores = calculate_daily_journal_scores(answers)
        payload = {
            "schema_version": 2,
            "student_id": student["_id"],
            "activity_date": body.activity_date,
            "subuh": subuh,
            "dzuhur": dzuhur,
            "ashar": ashar,
            "maghrib": maghrib,
            "isya": isya,
            "belajar_items": belajar_items,
            "akhlak_items": akhlak_items,
            "pengembangan_ekskul": pengembangan_ekskul,
            "sleep_window": sleep_window,
            "wake_window": wake_window,
            "notes": getattr(body, "notes", None),
            "answers": answers,
            "scores": scores,
            "scoring_version": 1,
            "updated_at": now,
            "submitted_late": submitted_late,
        }
    else:
        # Format lama v1
        payload = body.dict()
        scores = calculate_v1_legacy_score(payload)
        payload["student_id"] = student["_id"]
        payload["scores"] = scores
        payload["updated_at"] = now
        payload["submitted_late"] = submitted_late

    existing = await db.daily_reports.find_one({"student_id": student["_id"], "activity_date": body.activity_date})

    # Preserve proofs & parent_confirmation (Maksimal 2 foto bukti per hari untuk hemat kuota)
    if getattr(body, "proofs", None) is not None:
        payload["proofs"] = body.proofs[:2]
    elif existing and "proofs" in existing:
        payload["proofs"] = existing["proofs"][:2]
    else:
        payload["proofs"] = []

    if existing and "parent_confirmation" in existing:
        payload["parent_confirmation"] = existing["parent_confirmation"]
    else:
        has_akhlak = bool(payload.get("akhlak_items") or payload.get("parent_activities"))
        payload["parent_confirmation"] = {
            "status": "pending" if has_akhlak else "not_required",
            "confirmed_by": None,
            "confirmed_at": None,
            "parent_note": None,
        }

    if existing:
        await db.daily_reports.update_one({"_id": existing["_id"]}, {"$set": payload})
        saved = await db.daily_reports.find_one({"_id": existing["_id"]})
    else:
        payload["_id"] = str(uuid.uuid4())
        payload["submitted_at"] = now
        await db.daily_reports.insert_one(payload)
        saved = payload

    try:
        await evaluate_student_badges(student["_id"])
    except Exception:
        pass

    return clean_report(saved)


@router.post("/reports/{activity_date}/photo")
@router.post("/journal/{activity_date}/proofs")
async def upload_proof_photo(
    activity_date: str,
    body: UploadPhotoIn,
    user: dict = Depends(require_role("siswa")),
):
    student = await get_student(user)
    if len(body.image_base64) > 2_000_000:
        raise HTTPException(status_code=400, detail="Ukuran foto melebihi batas (maks 1.5MB)")

    report = await db.daily_reports.find_one({"student_id": student["_id"], "activity_date": activity_date})
    if not report:
        raise HTTPException(
            status_code=404,
            detail="Silakan isi dan simpan jurnal harian terlebih dahulu sebelum mengunggah foto bukti.",
        )

    current_proofs = report.get("proofs", [])
    if len(current_proofs) >= 2:
        raise HTTPException(
            status_code=400,
            detail="Maksimal 2 foto bukti per hari untuk menjaga kuota server sekolah.",
        )

    proof_item = {
        "id": f"PRF_{uuid.uuid4().hex[:10]}",
        "url": body.image_base64,
        "caption": body.caption or "",
        "uploaded_at": now_jakarta().isoformat(),
    }

    await db.daily_reports.update_one(
        {"_id": report["_id"]},
        {"$push": {"proofs": proof_item}, "$set": {"updated_at": now_jakarta()}},
    )
    return {"ok": True, "message": "Foto bukti berhasil disimpan", "proof": proof_item}


@router.get("/parent-notes")
async def student_parent_notes(user: dict = Depends(require_role("siswa"))):
    student = await get_student(user)
    notes = await db.parent_notes.find({"student_id": student["_id"]}).sort("created_at", -1).to_list(20)
    for n in notes:
        n["id"] = str(n.pop("_id"))
    return notes


@router.get("/announcements")
async def student_announcements(user: dict = Depends(require_role("siswa"))):
    student = await get_student(user)
    announcements = await db.announcements.find({
        "$or": [{"class_id": student["class_id"]}, {"class_id": "Semua"}]
    }).sort("created_at", -1).to_list(20)
    for a in announcements:
        a["id"] = str(a.pop("_id"))
    return announcements


@router.get("/badges")
async def student_badges(user: dict = Depends(require_role("siswa"))):
    student = await get_student(user)
    # Re-evaluate just in case
    await evaluate_student_badges(student["_id"])
    return await get_student_badges_progress(student["_id"])



