from datetime import timedelta
import csv
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from database import db
from models import TeacherMentoringNoteIn, AnnouncementIn
from auth_utils import require_role, now_jakarta, today_jakarta_str
from services.scoring import calculate_v1_legacy_score

router = APIRouter(prefix="/api/teacher", tags=["teacher"])


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

    today_reports = await db.daily_reports.find({
        "student_id": {"$in": student_ids}, "activity_date": target_date
    }).to_list(len(student_ids) or 1)

    submitted = len(today_reports)
    pending = total - submitted
    percentage = round((submitted / total) * 100, 1) if total else 0.0

    parent_confirmed_count = 0
    scores_sum = 0
    for r in today_reports:
        sc = r.get("scores") or calculate_v1_legacy_score(r)
        scores_sum += sc.get("total", 0)
        conf = r.get("parent_confirmation")
        if conf and conf.get("status") == "confirmed":
            parent_confirmed_count += 1

    avg_score = round(scores_sum / submitted, 1) if submitted else 0.0

    return {
        "teacher": {"teacher_id": teacher["_id"], "name": teacher["name"]},
        "date": target_date,
        "total_students": total,
        "submitted_today": submitted,
        "pending_today": pending,
        "percentage": percentage,
        "average_score": avg_score,
        "parent_confirmed_count": parent_confirmed_count,
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
    scores_list = []
    for report in reports:
        sc = report.get("scores") or calculate_v1_legacy_score(report)
        scores_list.append(sc.get("total", 0))
        for waktu in ["subuh", "dzuhur", "ashar", "maghrib", "isya"]:
            total_slots += 1
            if report.get(waktu) == "jamaah":
                berjamaah_slots += 1

    avg_score = round(sum(scores_list) / len(scores_list), 1) if scores_list else 0.0

    return {
        "days": days,
        "submitted_count": submitted_count,
        "submission_rate": round((submitted_count / days) * 100, 1) if days else 0.0,
        "prayer_berjamaah_rate": round((berjamaah_slots / total_slots) * 100, 1) if total_slots else 0.0,
        "average_score": avg_score,
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
async def add_student(user: dict = Depends(require_role("guru"))):
    raise HTTPException(
        status_code=403,
        detail="Fitur penambahan siswa oleh Guru Wali telah dinonaktifkan. Pengelolaan data siswa baru kini sepenuhnya dikelola terpusat oleh Admin Sekolah.",
    )


@router.get("/class-character-analysis")
async def class_character_analysis(days: int = Query(7), user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    students = await db.students.find({"teacher_id": teacher["_id"]}).to_list(500)
    student_ids = [s["_id"] for s in students]
    if not student_ids:
        return {
            "total_students": 0,
            "days": days,
            "class_average_score": 0.0,
            "category_averages": {"ibadah": 0.0, "belajar": 0.0, "akhlak": 0.0, "pengembangan": 0.0},
            "prayer_berjamaah_rate": 0.0,
            "subuh_jamaah_rate": 0.0,
            "student_rankings": [],
        }

    start_date = (now_jakarta().date() - timedelta(days=days - 1)).isoformat()
    end_date = now_jakarta().date().isoformat()

    reports = await db.daily_reports.find({
        "student_id": {"$in": student_ids},
        "activity_date": {"$gte": start_date, "$lte": end_date},
    }).to_list(len(student_ids) * days)

    total_score_sum = 0
    cat_sums = {"ibadah": 0, "belajar": 0, "akhlak": 0, "pengembangan": 0}
    subuh_jamaah_count = 0
    all_jamaah_count = 0
    total_prayer_slots = 0

    student_stats = {
        s["_id"]: {
            "student_id": s["_id"],
            "name": s["name"],
            "class_id": s["class_id"],
            "nipd": s["nipd"],
            "filled_count": 0,
            "score_sum": 0,
        }
        for s in students
    }

    for r in reports:
        sid = r.get("student_id")
        sc = r.get("scores") or calculate_v1_legacy_score(r)
        total_score_sum += sc.get("total", 0)
        for k in cat_sums:
            cat_sums[k] += sc.get(k, 0)

        if r.get("subuh") == "jamaah":
            subuh_jamaah_count += 1
        for w in ["subuh", "dzuhur", "ashar", "maghrib", "isya"]:
            total_prayer_slots += 1
            if r.get(w) == "jamaah":
                all_jamaah_count += 1

        if sid in student_stats:
            student_stats[sid]["filled_count"] += 1
            student_stats[sid]["score_sum"] += sc.get("total", 0)

    report_count = len(reports)
    avg_class_score = round(total_score_sum / report_count, 1) if report_count else 0.0
    cat_avgs = {k: round(v / report_count, 1) if report_count else 0.0 for k, v in cat_sums.items()}
    subuh_rate = round((subuh_jamaah_count / report_count) * 100, 1) if report_count else 0.0
    prayer_rate = round((all_jamaah_count / total_prayer_slots) * 100, 1) if total_prayer_slots else 0.0

    ranked_students = []
    for sid, stat in student_stats.items():
        fc = stat["filled_count"]
        stat["average_score"] = round(stat["score_sum"] / fc, 1) if fc else 0.0
        stat["submission_rate"] = round((fc / days) * 100, 1)
        ranked_students.append(stat)
    ranked_students.sort(key=lambda x: (x["average_score"], x["submission_rate"]), reverse=True)

    return {
        "teacher": {"id": teacher["_id"], "name": teacher["name"]},
        "total_students": len(students),
        "days": days,
        "total_reports": report_count,
        "class_average_score": avg_class_score,
        "category_averages": cat_avgs,
        "prayer_berjamaah_rate": prayer_rate,
        "subuh_jamaah_rate": subuh_rate,
        "student_rankings": ranked_students,
    }


@router.get("/students/{student_id}/mentoring-notes")
async def list_mentoring_notes(student_id: str, user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    await get_owned_student(teacher["_id"], student_id)
    notes = await db.mentoring_notes.find({"student_id": student_id}).sort("created_at", -1).to_list(100)
    for n in notes:
        n["id"] = str(n.pop("_id"))
    return notes


@router.post("/students/{student_id}/mentoring-notes")
async def create_mentoring_note(student_id: str, body: TeacherMentoringNoteIn, user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    student = await get_owned_student(teacher["_id"], student_id)
    if not body.note.strip():
        raise HTTPException(status_code=400, detail="Catatan pendampingan tidak boleh kosong")

    now = now_jakarta()
    doc = {
        "_id": f"MN_{uuid.uuid4().hex[:12]}",
        "teacher_id": teacher["_id"],
        "teacher_name": teacher["name"],
        "student_id": student["_id"],
        "student_name": student["name"],
        "class_id": student["class_id"],
        "category": body.category,
        "note": body.note.strip(),
        "follow_up_action": (body.follow_up_action or "").strip() or None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.mentoring_notes.insert_one(doc)
    doc_copy = dict(doc)
    doc_copy["id"] = doc_copy.pop("_id")
    return {"ok": True, "message": "Catatan pendampingan berhasil disimpan", "note": doc_copy}


@router.delete("/mentoring-notes/{note_id}")
async def delete_mentoring_note(note_id: str, user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    res = await db.mentoring_notes.delete_one({"_id": note_id, "teacher_id": teacher["_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catatan pendampingan tidak ditemukan atau bukan milik Anda")
    return {"ok": True, "message": "Catatan pendampingan berhasil dihapus"}


@router.get("/announcements")
async def list_announcements(user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    announcements = await db.announcements.find({"author_id": teacher["_id"]}).sort("created_at", -1).to_list(50)
    for a in announcements:
        a["id"] = str(a.pop("_id"))
    return announcements


@router.post("/announcements")
async def create_announcement(body: AnnouncementIn, user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    if not body.title.strip() or not body.content.strip():
        raise HTTPException(status_code=400, detail="Judul dan isi pengumuman tidak boleh kosong")

    students = await db.students.find({"teacher_id": teacher["_id"]}).to_list(1)
    class_id = students[0]["class_id"] if students else "Semua"

    now = now_jakarta()
    doc = {
        "_id": f"ANN_{uuid.uuid4().hex[:12]}",
        "author_id": teacher["_id"],
        "author_name": teacher["name"],
        "class_id": class_id,
        "title": body.title.strip(),
        "content": body.content.strip(),
        "priority": body.priority,
        "created_at": now.isoformat(),
    }
    await db.announcements.insert_one(doc)
    doc_copy = dict(doc)
    doc_copy["id"] = doc_copy.pop("_id")
    return {"ok": True, "message": "Pengumuman berhasil dipublikasikan", "announcement": doc_copy}


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    res = await db.announcements.delete_one({"_id": announcement_id, "author_id": teacher["_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pengumuman tidak ditemukan atau bukan milik Anda")
    return {"ok": True, "message": "Pengumuman berhasil dihapus"}


@router.get("/export-recap")
async def export_recap(days: int = Query(30, ge=1, le=180), user: dict = Depends(require_role("guru"))):
    teacher = await get_teacher(user)
    students = await db.students.find({"teacher_id": teacher["_id"]}).sort("name", 1).to_list(500)
    student_ids = [s["_id"] for s in students]

    end_dt = now_jakarta().date()
    start_dt = end_dt - timedelta(days=days - 1)
    start_str = start_dt.isoformat()
    end_str = end_dt.isoformat()

    reports = await db.daily_reports.find({
        "student_id": {"$in": student_ids},
        "activity_date": {"$gte": start_str, "$lte": end_str}
    }).to_list(10000)

    report_map = {}
    for r in reports:
        sid = r["student_id"]
        report_map.setdefault(sid, []).append(r)

    output = io.StringIO()
    output.write("\ufeff")  # UTF-8 BOM for Excel
    writer = csv.writer(output, delimiter=",")
    writer.writerow([
        "No",
        "NIPD",
        "Nama Siswa",
        "Kelas",
        "Hari Mengisi",
        "Rata-rata Skor (Max 87)",
        "Predikat Karakter",
        "Rata-rata Ibadah (Max 20)",
        "Rata-rata Belajar (Max 39)",
        "Rata-rata Akhlak (Max 15)",
        "Rata-rata Peng. Diri (Max 13)",
        "Kepatuhan Sholat (%)",
        "Konfirmasi Ortu (Disetujui)",
    ])

    for idx, s in enumerate(students, 1):
        s_reps = report_map.get(s["_id"], [])
        fill_count = len(s_reps)
        if fill_count > 0:
            total_sum = 0
            ibadah_sum = 0
            belajar_sum = 0
            akhlak_sum = 0
            pengembangan_sum = 0
            sholat_passed = 0
            sholat_total = 0
            confirmed_count = 0

            for r in s_reps:
                sc = r.get("scores") or calculate_v1_legacy_score(r)
                total_sum += sc.get("total", 0)
                cats = sc.get("categories", {})
                ibadah_sum += sc.get("ibadah", 0) or cats.get("ibadah", {}).get("score", 0)
                belajar_sum += sc.get("belajar", 0) or cats.get("belajar", {}).get("score", 0)
                akhlak_sum += sc.get("akhlak", 0) or cats.get("akhlak", {}).get("score", 0)
                pengembangan_sum += sc.get("pengembangan", 0) or cats.get("pengembangan_diri", {}).get("score", 0)

                sholat = r.get("sholat") or {}
                for p in ["subuh", "dzuhur", "ashar", "maghrib", "isya"]:
                    if p in sholat:
                        sholat_total += 1
                        if sholat[p] in ["jamaah_masjid", "jamaah", "sendiri"]:
                            sholat_passed += 1

                conf = r.get("parent_confirmation") or {}
                if conf.get("status") == "confirmed":
                    confirmed_count += 1

            avg_total = round(total_sum / fill_count, 1)
            avg_ibadah = round(ibadah_sum / fill_count, 1)
            avg_belajar = round(belajar_sum / fill_count, 1)
            avg_akhlak = round(akhlak_sum / fill_count, 1)
            avg_pengembangan = round(pengembangan_sum / fill_count, 1)
            pct_sholat = round((sholat_passed / sholat_total * 100), 1) if sholat_total else 0.0

            if avg_total >= 70:
                predikat = "Sangat Baik"
            elif avg_total >= 55:
                predikat = "Baik"
            elif avg_total >= 40:
                predikat = "Cukup"
            else:
                predikat = "Perlu Bimbingan"
        else:
            avg_total = 0.0
            predikat = "Belum Ada Data"
            avg_ibadah = 0.0
            avg_belajar = 0.0
            avg_akhlak = 0.0
            avg_pengembangan = 0.0
            pct_sholat = 0.0
            confirmed_count = 0

        writer.writerow([
            idx,
            s.get("nipd", "-"),
            s.get("name", "-"),
            s.get("class_id", "-"),
            fill_count,
            avg_total,
            predikat,
            avg_ibadah,
            avg_belajar,
            avg_akhlak,
            avg_pengembangan,
            f"{pct_sholat}%",
            confirmed_count,
        ])

    csv_data = output.getvalue()
    filename = f"rekap_karakter_{start_str}_sd_{end_str}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


