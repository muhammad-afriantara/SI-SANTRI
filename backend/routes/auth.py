from fastapi import APIRouter, HTTPException, Depends

from database import db
from models import LoginRequest
from auth_utils import (
    normalize_identifier,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

VALID_ROLES = {"siswa", "guru", "wali_murid"}


async def build_profile(user: dict) -> dict:
    role = user["role"]
    if role == "siswa":
        student = await db.students.find_one({"_id": user["ref_id"]})
        return {
            "student_id": student["_id"],
            "name": student["name"],
            "nipd": student["nipd"],
            "class_id": student["class_id"],
            "teacher_name": student["teacher_name"],
        }
    if role == "guru":
        teacher = await db.teachers.find_one({"_id": user["ref_id"]})
        total_students = await db.students.count_documents({"teacher_id": teacher["_id"]})
        return {
            "teacher_id": teacher["_id"],
            "name": teacher["name"],
            "username": teacher["username"],
            "total_students": total_students,
        }
    if role == "wali_murid":
        parent = await db.parents.find_one({"_id": user["ref_id"]})
        student = await db.students.find_one({"_id": parent["student_id"]})
        return {
            "parent_id": parent["_id"],
            "name": parent["name"],
            "student_id": student["_id"],
            "student_name": student["name"],
            "class_id": student["class_id"],
            "teacher_name": student["teacher_name"],
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
