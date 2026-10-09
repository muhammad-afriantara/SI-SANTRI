import csv
from datetime import timedelta
import io
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from database import db, DEFAULT_PASSWORD
from models import (
    AddStudentRequest,
    UpdateStudentRequest,
    AdminAddTeacherRequest,
    AdminAddClassRequest,
    ResetPasswordRequest,
)
from auth_utils import (
    require_role,
    now_jakarta,
    today_jakarta_str,
    normalize_identifier,
    hash_password,
)
from services.scoring import calculate_v1_legacy_score

router = APIRouter(prefix="/api/admin", tags=["admin"])


def clean_doc(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    d = dict(doc)
    d.pop("_id", None)
    return d


@router.get("/dashboard")
async def admin_dashboard(user: dict = Depends(require_role("admin"))):
    today = today_jakarta_str()
    total_students = await db.students.count_documents({})
    total_teachers = await db.teachers.count_documents({})
    total_classes = await db.classes.count_documents({})
    submitted_today = await db.daily_reports.count_documents({"activity_date": today})
    pending_today = max(0, total_students - submitted_today)
    completion_rate = round((submitted_today / total_students) * 100, 1) if total_students else 0.0

    # Rekap pengisian per kelas hari ini (Dioptimalkan dalam 2 query agregasi kilat)
    classes = await db.classes.find({}).sort("_id", 1).to_list(100)
    
    # 1. Hitung total siswa & daftar ID siswa per kelas via agregasi
    class_students_agg = await db.students.aggregate([
        {"$group": {"_id": "$class_id", "total": {"$sum": 1}, "ids": {"$push": "$_id"}}}
    ]).to_list(100)
    class_students_map = {item["_id"]: item for item in class_students_agg}

    # 2. Ambil seluruh daily report hari ini dalam 1 query
    today_reports = await db.daily_reports.find(
        {"activity_date": today},
        {"student_id": 1}
    ).to_list(5000)
    submitted_student_ids = set(r["student_id"] for r in today_reports)

    class_stats = []
    for c in classes:
        c_id = c["_id"]
        c_data = class_students_map.get(c_id, {"total": 0, "ids": []})
        c_total = c_data["total"]
        c_submitted = sum(1 for sid in c_data["ids"] if sid in submitted_student_ids)
        class_stats.append({
            "class_id": c_id,
            "total_students": c_total,
            "submitted_today": c_submitted,
            "pending_today": max(0, c_total - c_submitted),
            "rate": round((c_submitted / c_total) * 100, 1) if c_total else 0.0,
        })

    return {
        "today_date": today,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "submitted_today": submitted_today,
        "pending_today": pending_today,
        "completion_rate": completion_rate,
        "class_stats": class_stats,
    }


@router.get("/students")
async def list_students(
    class_id: Optional[str] = Query(None),
    search: Optional[str] = Query(""),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user: dict = Depends(require_role("admin")),
):
    query = {}
    if class_id:
        query["class_id"] = class_id.strip()
    if search and search.strip():
        query["$or"] = [
            {"name": {"$regex": search.strip(), "$options": "i"}},
            {"nipd": {"$regex": search.strip(), "$options": "i"}},
        ]

    total = await db.students.count_documents(query)
    students = (
        await db.students.find(query)
        .sort([("class_id", 1), ("name", 1)])
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )

    # Batch lookup parent_id dalam 1 query tunggal (Bukan 100 query berulang)
    student_ids = [s["_id"] for s in students]
    parents = await db.parents.find(
        {"student_id": {"$in": student_ids}},
        {"_id": 1, "student_id": 1}
    ).to_list(len(student_ids) + 10)
    parent_map = {p["student_id"]: p["_id"] for p in parents}

    result = []
    for s in students:
        result.append({
            "student_id": s["_id"],
            "name": s["name"],
            "nipd": s["nipd"],
            "class_id": s["class_id"],
            "teacher_id": s.get("teacher_id"),
            "teacher_name": s.get("teacher_name"),
            "parent_id": parent_map.get(s["_id"]),
            "is_active": s.get("is_active", True),
        })

    return {"total": total, "skip": skip, "limit": limit, "items": result}


@router.get("/students/{student_id}")
async def get_student_detail(student_id: str, user: dict = Depends(require_role("admin"))):
    student = await db.students.find_one({"_id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")

    parent = await db.parents.find_one({"student_id": student_id})
    student_user = await db.users.find_one({"ref_id": student_id})
    parent_user = await db.users.find_one({"ref_id": parent["_id"]}) if parent else None

    return {
        "student": {
            "student_id": student["_id"],
            "name": student["name"],
            "nipd": student["nipd"],
            "class_id": student["class_id"],
            "teacher_id": student.get("teacher_id"),
            "teacher_name": student.get("teacher_name"),
            "is_active": student.get("is_active", True),
        },
        "parent": {
            "parent_id": parent["_id"] if parent else None,
            "name": parent["name"] if parent else None,
        } if parent else None,
        "accounts": {
            "student_login": student["nipd"],
            "parent_login": parent_user.get("username") if parent_user else None,
            "student_active": student_user.get("is_active", True) if student_user else False,
            "parent_active": parent_user.get("is_active", True) if parent_user else False,
        },
    }


@router.post("/students")
async def add_student(body: AddStudentRequest, user: dict = Depends(require_role("admin"))):
    clean_nipd = body.nipd.strip()
    clean_name = body.name.strip()

    existing_nipd = await db.students.find_one({"nipd": clean_nipd})
    if existing_nipd:
        raise HTTPException(status_code=400, detail="NIPD sudah terdaftar")

    class_doc = await db.classes.find_one({"_id": body.class_id})
    if not class_doc:
        raise HTTPException(status_code=400, detail="Kelas tidak ditemukan")

    teacher_id = body.teacher_id
    teacher_name = "-"
    if teacher_id:
        teacher = await db.teachers.find_one({"_id": teacher_id})
        if teacher:
            teacher_name = teacher["name"]
    else:
        # Cari guru yang memegang kelas ini jika ada
        existing_student = await db.students.find_one({"class_id": body.class_id, "teacher_id": {"$ne": None}})
        if existing_student:
            teacher_id = existing_student.get("teacher_id")
            teacher_name = existing_student.get("teacher_name", "-")

    student_id = f"S{uuid.uuid4().hex[:8].upper()}"
    parent_id = f"P{uuid.uuid4().hex[:8].upper()}"
    child_username = normalize_identifier(clean_name)
    password_hash = hash_password(DEFAULT_PASSWORD)
    created_at = now_jakarta()

    await db.students.insert_one({
        "_id": student_id,
        "name": clean_name,
        "nipd": clean_nipd,
        "class_id": body.class_id,
        "teacher_id": teacher_id,
        "teacher_name": teacher_name,
        "is_active": True,
        "created_at": created_at,
    })

    await db.parents.insert_one({
        "_id": parent_id,
        "name": f"Wali dari {clean_name}",
        "student_id": student_id,
        "created_at": created_at,
    })

    await db.users.insert_many([
        {
            "_id": f"U_{student_id}",
            "role": "siswa",
            "username": None,
            "nipd": clean_nipd,
            "password_hash": password_hash,
            "display_name": clean_name,
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
            "display_name": f"Wali dari {clean_name}",
            "ref_id": parent_id,
            "is_active": True,
            "created_at": created_at,
        },
    ])

    return {
        "student_id": student_id,
        "name": clean_name,
        "nipd": clean_nipd,
        "class_id": body.class_id,
        "teacher_name": teacher_name,
        "login_siswa": {"nipd": clean_nipd, "password": DEFAULT_PASSWORD},
        "login_wali_murid": {"username": child_username, "password": DEFAULT_PASSWORD},
    }


@router.put("/students/{student_id}")
async def update_student(
    student_id: str,
    body: UpdateStudentRequest,
    user: dict = Depends(require_role("admin")),
):
    student = await db.students.find_one({"_id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")

    update_fields = {}
    if body.name is not None and body.name.strip():
        update_fields["name"] = body.name.strip()
    if body.class_id is not None:
        class_doc = await db.classes.find_one({"_id": body.class_id})
        if not class_doc:
            raise HTTPException(status_code=400, detail="Kelas tidak valid")
        update_fields["class_id"] = body.class_id
    if body.teacher_id is not None:
        teacher = await db.teachers.find_one({"_id": body.teacher_id})
        if not teacher:
            raise HTTPException(status_code=400, detail="Guru tidak ditemukan")
        update_fields["teacher_id"] = teacher["_id"]
        update_fields["teacher_name"] = teacher["name"]
    if body.is_active is not None:
        update_fields["is_active"] = body.is_active

    if not update_fields:
        return {"message": "Tidak ada perubahan"}

    update_fields["updated_at"] = now_jakarta()
    await db.students.update_one({"_id": student_id}, {"$set": update_fields})

    # Sinkronisasi ke akun siswa & wali jika nama berubah
    if "name" in update_fields:
        new_name = update_fields["name"]
        await db.users.update_one({"ref_id": student_id}, {"$set": {"display_name": new_name}})
        parent = await db.parents.find_one({"student_id": student_id})
        if parent:
            await db.parents.update_one({"_id": parent["_id"]}, {"$set": {"name": f"Wali dari {new_name}"}})
            await db.users.update_one({"ref_id": parent["_id"]}, {"$set": {"display_name": f"Wali dari {new_name}"}})

    # Sinkronisasi status aktif
    if "is_active" in update_fields:
        status_val = update_fields["is_active"]
        await db.users.update_one({"ref_id": student_id}, {"$set": {"is_active": status_val}})
        parent = await db.parents.find_one({"student_id": student_id})
        if parent:
            await db.users.update_one({"ref_id": parent["_id"]}, {"$set": {"is_active": status_val}})

    updated = await db.students.find_one({"_id": student_id})
    return clean_doc(updated)


@router.post("/students/{student_id}/deactivate")
async def toggle_student_status(student_id: str, user: dict = Depends(require_role("admin"))):
    student = await db.students.find_one({"_id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")

    current_status = student.get("is_active", True)
    new_status = not current_status

    await db.students.update_one({"_id": student_id}, {"$set": {"is_active": new_status, "updated_at": now_jakarta()}})
    await db.users.update_one({"ref_id": student_id}, {"$set": {"is_active": new_status}})
    parent = await db.parents.find_one({"student_id": student_id})
    if parent:
        await db.users.update_one({"ref_id": parent["_id"]}, {"$set": {"is_active": new_status}})

    return {"student_id": student_id, "is_active": new_status}


@router.post("/students/import")
async def import_students(
    items: List[AddStudentRequest],
    user: dict = Depends(require_role("admin")),
):
    if not items:
        raise HTTPException(status_code=400, detail="Daftar siswa kosong")

    created = []
    errors = []

    for idx, item in enumerate(items):
        try:
            clean_nipd = item.nipd.strip()
            clean_name = item.name.strip()

            existing = await db.students.find_one({"nipd": clean_nipd})
            if existing:
                errors.append({"row": idx + 1, "nipd": clean_nipd, "error": "NIPD sudah terdaftar"})
                continue

            class_doc = await db.classes.find_one({"_id": item.class_id})
            if not class_doc:
                errors.append({"row": idx + 1, "nipd": clean_nipd, "error": f"Kelas '{item.class_id}' tidak ditemukan"})
                continue

            teacher_id = item.teacher_id
            teacher_name = "-"
            if teacher_id:
                t = await db.teachers.find_one({"_id": teacher_id})
                if t:
                    teacher_name = t["name"]

            student_id = f"S{uuid.uuid4().hex[:8].upper()}"
            parent_id = f"P{uuid.uuid4().hex[:8].upper()}"
            child_username = normalize_identifier(clean_name)
            password_hash = hash_password(DEFAULT_PASSWORD)
            created_at = now_jakarta()

            await db.students.insert_one({
                "_id": student_id,
                "name": clean_name,
                "nipd": clean_nipd,
                "class_id": item.class_id,
                "teacher_id": teacher_id,
                "teacher_name": teacher_name,
                "is_active": True,
                "created_at": created_at,
            })
            await db.parents.insert_one({
                "_id": parent_id,
                "name": f"Wali dari {clean_name}",
                "student_id": student_id,
                "created_at": created_at,
            })
            await db.users.insert_many([
                {
                    "_id": f"U_{student_id}",
                    "role": "siswa",
                    "username": None,
                    "nipd": clean_nipd,
                    "password_hash": password_hash,
                    "display_name": clean_name,
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
                    "display_name": f"Wali dari {clean_name}",
                    "ref_id": parent_id,
                    "is_active": True,
                    "created_at": created_at,
                },
            ])
            created.append({"student_id": student_id, "name": clean_name, "nipd": clean_nipd, "class_id": item.class_id})
        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e)})

    return {
        "total_requested": len(items),
        "total_imported": len(created),
        "total_errors": len(errors),
        "imported": created,
        "errors": errors,
    }


@router.get("/teachers")
async def list_teachers(user: dict = Depends(require_role("admin"))):
    teachers = await db.teachers.find({}).sort("name", 1).to_list(100)
    result = []
    for t in teachers:
        student_count = await db.students.count_documents({"teacher_id": t["_id"]})
        distinct_classes = await db.students.distinct("class_id", {"teacher_id": t["_id"]})
        result.append({
            "teacher_id": t["_id"],
            "name": t["name"],
            "username": t["username"],
            "classes": distinct_classes,
            "student_count": student_count,
        })
    return result


@router.post("/teachers")
async def add_teacher(body: AdminAddTeacherRequest, user: dict = Depends(require_role("admin"))):
    clean_name = body.name.strip()
    username = normalize_identifier(body.username or clean_name)

    existing = await db.users.find_one({"role": "guru", "username": username})
    if existing:
        raise HTTPException(status_code=400, detail="Username guru sudah digunakan")

    teacher_id = f"T{uuid.uuid4().hex[:6].upper()}"
    password_hash = hash_password(DEFAULT_PASSWORD)
    created_at = now_jakarta()

    await db.teachers.insert_one({
        "_id": teacher_id,
        "name": clean_name,
        "username": username,
    })
    await db.users.insert_one({
        "_id": f"U_{teacher_id}",
        "role": "guru",
        "username": username,
        "password_hash": password_hash,
        "display_name": clean_name,
        "ref_id": teacher_id,
        "is_active": True,
        "created_at": created_at,
    })

    return {
        "teacher_id": teacher_id,
        "name": clean_name,
        "username": username,
        "password": DEFAULT_PASSWORD,
    }


@router.get("/classes")
async def list_classes(user: dict = Depends(require_role("admin"))):
    classes = await db.classes.find({}).sort("_id", 1).to_list(100)
    result = []
    for c in classes:
        c_id = c["_id"]
        total = await db.students.count_documents({"class_id": c_id})
        result.append({"class_id": c_id, "name": c.get("name", c_id), "student_count": total})
    return result


@router.post("/classes")
async def add_class(body: AdminAddClassRequest, user: dict = Depends(require_role("admin"))):
    c_id = body.name.strip().upper()
    existing = await db.classes.find_one({"_id": c_id})
    if existing:
        raise HTTPException(status_code=400, detail="Kelas sudah terdaftar")

    await db.classes.insert_one({"_id": c_id, "name": c_id})
    return {"class_id": c_id, "name": c_id}


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    body: ResetPasswordRequest,
    user: dict = Depends(require_role("admin")),
):
    target_user = await db.users.find_one({"_id": user_id})
    if not target_user:
        target_user = await db.users.find_one({"_id": f"U_{user_id}"})
    if not target_user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")

    new_password = body.new_password or DEFAULT_PASSWORD
    new_hash = hash_password(new_password)

    await db.users.update_one(
        {"_id": target_user["_id"]},
        {
            "$set": {
                "password_hash": new_hash,
                "must_change_password": True,
                "updated_at": now_jakarta(),
            }
        },
    )

    return {
        "user_id": target_user["_id"],
        "display_name": target_user.get("display_name"),
        "role": target_user.get("role"),
        "message": f"Password berhasil direset ke '{new_password}'",
    }


@router.get("/export-recap")
async def export_recap(
    days: int = Query(30, ge=1, le=180),
    class_id: Optional[str] = Query(None),
    user: dict = Depends(require_role("admin")),
):
    query = {}
    if class_id and class_id.strip():
        query["class_id"] = class_id.strip()

    students = await db.students.find(query).sort([("class_id", 1), ("name", 1)]).to_list(1000)
    student_ids = [s["_id"] for s in students]

    end_dt = now_jakarta().date()
    start_dt = end_dt - timedelta(days=days - 1)
    start_str = start_dt.isoformat()
    end_str = end_dt.isoformat()

    reports = await db.daily_reports.find({
        "student_id": {"$in": student_ids},
        "activity_date": {"$gte": start_str, "$lte": end_str}
    }).to_list(20000)

    report_map = {}
    for r in reports:
        sid = r["student_id"]
        report_map.setdefault(sid, []).append(r)

    # Fetch badges for students
    badges_cursor = await db.student_badges.find({"student_id": {"$in": student_ids}}).to_list(5000)
    badges_map = {}
    for b in badges_cursor:
        badges_map.setdefault(b["student_id"], []).append(b.get("badge_id"))

    output = io.StringIO()
    output.write("\ufeff")  # UTF-8 BOM for Excel
    writer = csv.writer(output, delimiter=",")
    writer.writerow([
        "No",
        "NIPD",
        "Nama Siswa",
        "Kelas",
        "Wali Kelas",
        "Hari Mengisi",
        "Rata-rata Skor (Max 87)",
        "Predikat Karakter",
        "Rata-rata Ibadah (Max 20)",
        "Rata-rata Belajar (Max 39)",
        "Rata-rata Akhlak (Max 15)",
        "Rata-rata Peng. Diri (Max 13)",
        "Kepatuhan Sholat (%)",
        "Konfirmasi Ortu (Disetujui)",
        "Total Lencana Terbuka",
    ])

    for idx, s in enumerate(students, 1):
        s_reps = report_map.get(s["_id"], [])
        fill_count = len(s_reps)
        s_badges = badges_map.get(s["_id"], [])
        badge_count = len(s_badges)

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
            s.get("teacher_name", "-"),
            fill_count,
            avg_total,
            predikat,
            avg_ibadah,
            avg_belajar,
            avg_akhlak,
            avg_pengembangan,
            f"{pct_sholat}%",
            confirmed_count,
            badge_count,
        ])

    csv_data = output.getvalue()
    filename = f"rekap_karakter_sekolah_{start_str}_sd_{end_str}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
