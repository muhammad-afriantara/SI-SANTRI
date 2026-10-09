from fastapi import APIRouter, HTTPException, Depends

from database import db
from models import LoginRequest, ChangePasswordRequest
from auth_utils import (
    normalize_identifier,
    verify_password,
    hash_password,
    now_jakarta,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

VALID_ROLES = {"siswa", "guru", "wali_murid", "admin"}


async def build_profile(user: dict) -> dict:
    role = user["role"]
    if role == "siswa":
        student = await db.students.find_one({"_id": user["ref_id"]})
        return {
            "student_id": student["_id"] if student else user["_id"],
            "name": student["name"] if student else user.get("display_name", ""),
            "nipd": student["nipd"] if student else user.get("nipd", ""),
            "class_id": student["class_id"] if student else "",
            "teacher_name": student["teacher_name"] if student else "",
            "must_change_password": user.get("must_change_password", False),
        }
    if role == "guru":
        teacher = await db.teachers.find_one({"_id": user["ref_id"]})
        total_students = await db.students.count_documents({"teacher_id": teacher["_id"]}) if teacher else 0
        return {
            "teacher_id": teacher["_id"] if teacher else user["_id"],
            "name": teacher["name"] if teacher else user.get("display_name", ""),
            "username": teacher["username"] if teacher else user.get("username", ""),
            "total_students": total_students,
            "must_change_password": user.get("must_change_password", False),
        }
    if role == "wali_murid":
        parent = await db.parents.find_one({"_id": user["ref_id"]})
        student = await db.students.find_one({"_id": parent["student_id"]}) if parent else None
        return {
            "parent_id": parent["_id"] if parent else user["_id"],
            "name": parent["name"] if parent else user.get("display_name", ""),
            "student_id": student["_id"] if student else "",
            "student_name": student["name"] if student else "",
            "class_id": student["class_id"] if student else "",
            "teacher_name": student["teacher_name"] if student else "",
            "must_change_password": user.get("must_change_password", False),
        }
    if role == "admin":
        return {
            "admin_id": user["_id"],
            "name": user.get("display_name", "Admin Sekolah"),
            "username": user.get("username", "admin"),
            "must_change_password": user.get("must_change_password", False),
        }
    raise HTTPException(status_code=400, detail="Peran tidak dikenali")


@router.post("/login")
async def login(body: LoginRequest):
    role = body.role.strip().lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Peran tidak valid")

    if role == "siswa":
        query = {"role": "siswa", "nipd": body.identifier.strip()}
    else:
        query = {"role": role, "username": normalize_identifier(body.identifier)}

    user = await db.users.find_one(query)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Identitas atau password salah")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Akun tidak aktif")

    token = create_access_token(user["_id"], user["role"])
    profile = await build_profile(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "profile": profile,
    }


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    profile = await build_profile(user)
    return {"role": user["role"], "profile": profile}


@router.post("/change-password")
async def change_password(body: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    if not verify_password(body.old_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Password lama salah")

    new_hash = hash_password(body.new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": new_hash,
                "must_change_password": False,
                "updated_at": now_jakarta(),
            }
        },
    )
    return {"message": "Password berhasil diperbarui"}

