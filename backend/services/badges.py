import logging
from datetime import timedelta
from database import db
from auth_utils import now_jakarta

logger = logging.getLogger(__name__)

BADGES_CATALOG = [
    {
        "id": "langkah_awal",
        "title": "Langkah Perdana",
        "description": "Mengisi dan menyimpan jurnal harian untuk pertama kali.",
        "icon": "🚀",
        "category": "konsistensi",
        "target": 1,
    },
    {
        "id": "pejuang_subuh_7",
        "title": "Pejuang Subuh",
        "description": "Melaksanakan sholat Subuh berjamaah selama minimal 7 hari.",
        "icon": "🌅",
        "category": "ibadah",
        "target": 7,
    },
    {
        "id": "anak_berbakti_7",
        "title": "Anak Berbakti",
        "description": "Melakukan kegiatan bakti di rumah (merapikan kamar / membantu orang tua) minimal 7 hari.",
        "icon": "💖",
        "category": "akhlak",
        "target": 7,
    },
    {
        "id": "pembelajar_tangguh",
        "title": "Penuntut Ilmu",
        "description": "Melaksanakan aktivitas belajar mandiri dan tugas guru minimal 7 hari.",
        "icon": "📚",
        "category": "belajar",
        "target": 7,
    },
    {
        "id": "disiplin_istirahat",
        "title": "Disiplin Istirahat",
        "description": "Tidur malam dan bangun pagi tepat waktu sesuai jadwal sunnah minimal 5 hari.",
        "icon": "🌙",
        "category": "pengembangan",
        "target": 5,
    },
    {
        "id": "santri_konsisten_30",
        "title": "Santri Teladan",
        "description": "Mengisi jurnal harian sebanyak 30 hari dengan istiqomah.",
        "icon": "🌟",
        "category": "konsistensi",
        "target": 30,
    },
]


async def evaluate_student_badges(student_id: str) -> list[str]:
    """Evaluates student progress and awards earned badges. Returns list of newly earned badge IDs."""
    reports = await db.daily_reports.find({"student_id": student_id}).sort("activity_date", -1).to_list(100)
    if not reports:
        return []

    # Get already earned badges
    existing_earned = await db.student_badges.find({"student_id": student_id}).to_list(50)
    earned_ids = {b["badge_id"] for b in existing_earned}

    total_reports = len(reports)
    subuh_jamaah_count = sum(1 for r in reports if r.get("subuh") == "jamaah")
    akhlak_count = sum(1 for r in reports if bool(r.get("akhlak_items") or r.get("parent_activities")))
    belajar_count = sum(1 for r in reports if bool(r.get("belajar_items") or r.get("study_activities")))
    disiplin_tidur_count = sum(1 for r in reports if r.get("sleep_window") in ("19_20", "20_21", "21_22") and r.get("wake_window") in ("03_04", "04_05", "05_06"))

    newly_earned = []
    now = now_jakarta().isoformat()

    checks = {
        "langkah_awal": total_reports >= 1,
        "pejuang_subuh_7": subuh_jamaah_count >= 7,
        "anak_berbakti_7": akhlak_count >= 7,
        "pembelajar_tangguh": belajar_count >= 7,
        "disiplin_istirahat": disiplin_tidur_count >= 5,
        "santri_konsisten_30": total_reports >= 30,
    }

    for b_id, is_met in checks.items():
        if is_met and b_id not in earned_ids:
            doc = {
                "student_id": student_id,
                "badge_id": b_id,
                "earned_at": now,
            }
            await db.student_badges.insert_one(doc)
            newly_earned.append(b_id)
            earned_ids.add(b_id)
            logger.info("Student %s earned badge: %s", student_id, b_id)

    return newly_earned


async def get_student_badges_progress(student_id: str) -> dict:
    """Returns catalog of badges with student's earned status and current progress numbers."""
    reports = await db.daily_reports.find({"student_id": student_id}).to_list(100)
    earned_docs = await db.student_badges.find({"student_id": student_id}).to_list(50)
    earned_map = {b["badge_id"]: b.get("earned_at") for b in earned_docs}

    total_reports = len(reports)
    subuh_jamaah_count = sum(1 for r in reports if r.get("subuh") == "jamaah")
    akhlak_count = sum(1 for r in reports if bool(r.get("akhlak_items") or r.get("parent_activities")))
    belajar_count = sum(1 for r in reports if bool(r.get("belajar_items") or r.get("study_activities")))
    disiplin_tidur_count = sum(1 for r in reports if r.get("sleep_window") in ("19_20", "20_21", "21_22") and r.get("wake_window") in ("03_04", "04_05", "05_06"))

    current_counts = {
        "langkah_awal": total_reports,
        "pejuang_subuh_7": subuh_jamaah_count,
        "anak_berbakti_7": akhlak_count,
        "pembelajar_tangguh": belajar_count,
        "disiplin_istirahat": disiplin_tidur_count,
        "santri_konsisten_30": total_reports,
    }

    result = []
    unlocked_count = 0
    for b in BADGES_CATALOG:
        b_id = b["id"]
        is_unlocked = b_id in earned_map
        if is_unlocked:
            unlocked_count += 1
        curr = current_counts.get(b_id, 0)
        result.append({
            **b,
            "unlocked": is_unlocked,
            "earned_at": earned_map.get(b_id),
            "current": min(curr, b["target"]),
            "percentage": min(100, round((curr / b["target"]) * 100)),
        })

    return {
        "total_badges": len(BADGES_CATALOG),
        "unlocked_count": unlocked_count,
        "badges": result,
    }
