import json
import logging
from pathlib import Path

from database import db, DEFAULT_PASSWORD
from auth_utils import hash_password, now_jakarta

logger = logging.getLogger(__name__)

SEED_FILE = Path(__file__).parent / "data" / "seed_data_santri.json"


async def seed_if_needed():
    """Seed classes, teachers, students, parents, users from seed_data_santri.json
    only if the users collection is currently empty."""
    existing = await db.users.count_documents({})
    if existing > 0:
        logger.info("Seed skipped: %d users already exist", existing)
        return

    # Drop any pre-existing indexes (e.g. from a legacy schema) so our own
    # compound unique indexes can be created without conflicts.
    for coll_name in ["classes", "teachers", "students", "parents", "users"]:
        try:
            await db[coll_name].drop_indexes()
        except Exception:
            pass

    with open(SEED_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    password_hash = hash_password(DEFAULT_PASSWORD)
    created_at = now_jakarta()

    class_docs = [{"_id": c, "name": c} for c in data["classes"]]
    if class_docs:
        await db.classes.insert_many(class_docs)

    teacher_docs = []
    user_docs = []
    for t in data["teachers"]:
        teacher_docs.append({
            "_id": t["id"],
            "name": t["name"],
            "username": t["username"],
        })
        user_docs.append({
            "_id": f"U_{t['id']}",
            "role": "guru",
            "username": t["username"],
            "password_hash": password_hash,
            "display_name": t["name"],
            "ref_id": t["id"],
            "is_active": True,
            "created_at": created_at,
        })
    if teacher_docs:
        await db.teachers.insert_many(teacher_docs)

    student_docs = []
    for s in data["students"]:
        student_docs.append({
            "_id": s["id"],
            "name": s["name"],
            "nipd": s["nipd"],
            "class_id": s["class"],
            "teacher_id": s["teacher_id"],
            "teacher_name": s["teacher_name"],
        })
        user_docs.append({
            "_id": f"U_{s['id']}",
            "role": "siswa",
            "nipd": s["nipd"],
            "password_hash": password_hash,
            "display_name": s["name"],
            "ref_id": s["id"],
            "is_active": True,
            "created_at": created_at,
        })
    if student_docs:
        await db.students.insert_many(student_docs)

    parent_docs = []
    for p in data["parents"]:
        parent_docs.append({
            "_id": p["id"],
            "name": p["name"],
            "student_id": p["child_id"],
        })
        user_docs.append({
            "_id": f"U_{p['id']}",
            "role": "wali_murid",
            "username": p["child_username"],
            "password_hash": password_hash,
            "display_name": p["name"],
            "ref_id": p["id"],
            "is_active": True,
            "created_at": created_at,
        })
    if parent_docs:
        await db.parents.insert_many(parent_docs)

    if user_docs:
        await db.users.insert_many(user_docs)

    await db.users.create_index(
        [("role", 1), ("nipd", 1)],
        unique=True,
        partialFilterExpression={"role": "siswa"},
        name="uniq_siswa_nipd",
    )
    await db.users.create_index(
        [("role", 1), ("username", 1)],
        unique=True,
        partialFilterExpression={"role": "guru"},
        name="uniq_guru_username",
    )
    await db.users.create_index([("role", 1), ("username", 1)], name="role_username_lookup")
    await db.daily_reports.create_index([("student_id", 1), ("activity_date", 1)], unique=True)
    await db.daily_reports.create_index([("activity_date", 1)])
    await db.students.create_index([("class_id", 1)])
    await db.students.create_index([("teacher_id", 1)])

    logger.info(
        "Seed complete: %d classes, %d teachers, %d students, %d parents, %d users",
        len(class_docs), len(teacher_docs), len(student_docs), len(parent_docs), len(user_docs),
    )
