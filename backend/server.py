import logging

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from database import db, client
from seed_logic import seed_if_needed
from routes import auth, student, teacher, parent, admin

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="SI SANTRI API")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(student.router)
app.include_router(teacher.router)
app.include_router(parent.router)
app.include_router(admin.router)


@app.get("/")
async def index():
    return {"message": "SI SANTRI API is running! Access API at /api/ or docs at /docs"}


@app.get("/api/")
async def root():
    return {"message": "SI SANTRI API - SMP NEGERI 2 PANJI"}


@app.get("/api/app-config")
async def app_config():
    return {
        "app_name": "SI-SANTRI",
        "school": "SMP NEGERI 2 PANJI",
        "min_version": "2.0.0",
        "latest_version": "2.0.0",
        "roles_supported": ["siswa", "guru", "wali_murid", "admin"],
        "features": {
            "admin_management": True,
            "teacher_add_student": False,  # Strict admin only
            "scoring_v2": True,
            "gamification": True,
            "parent_confirmations": True,
            "photo_evidence": True,
            "mentoring_notes": True,
            "announcements": True,
            "export_recap": True,
        },
    }



@app.on_event("startup")
async def on_startup():
    await seed_if_needed()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
