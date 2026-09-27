import logging

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from database import db, client
from seed_logic import seed_if_needed
from routes import auth, student, teacher, parent

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


@app.get("/api/")
async def root():
    return {"message": "SI SANTRI API - SMP NEGERI 2 PANJI"}


@app.on_event("startup")
async def on_startup():
    await seed_if_needed()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
