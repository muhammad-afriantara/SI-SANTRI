"""
Layanan Perhitungan Skor Karakter (Scoring Engine) SI SANTRI
Berdasarkan Rancangan 2 - SMP NEGERI 2 PANJI
"""
from typing import Dict, List, Any

# 1. Kategori Ibadah (Sholat 5 Waktu)
IBADAH_SCORES = {
    "jamaah": 4,
    "munfarid": 3,
    "berhalangan": 0,
    "tidak_sholat": -3,
}
IBADAH_MAX = 20  # 5 waktu x 4 poin

# 2. Kategori Belajar (Checklist)
BELAJAR_SCORES = {
    # Mengerjakan tugas (max 9)
    "tugas_selesai": 3,
    "tugas_mandiri": 3,
    "tugas_tepat_waktu": 3,
    # Membaca materi (max 8)
    "baca_hari_ini": 3,
    "baca_persiapan": 5,
    # Menyimak materi (max 6)
    "menyimak_penjelasan": 3,
    "menyimak_selesai": 3,
    # Menulis atau mencatat (max 8)
    "catat_poin": 3,
    "catat_rangkuman": 5,
    # Ekstrakurikuler belajar (max 8)
    "ekskul_jadwal": 3,
    "ekskul_mandiri": 5,
}
BELAJAR_MAX = 39

# 3. Kategori Akhlak (Bakti di Rumah)
AKHLAK_SCORES = {
    "rapikan_barang": 3,
    "bersih_rumah": 3,
    "masak_hidangan": 3,
    "bantu_ortu": 3,
    "rawat_hewan_tanaman": 3,
}
AKHLAK_MAX = 15  # 5 indikator x 3 poin

# 4. Kategori Pengembangan Diri
PENGEMBANGAN_EKSKUL_SCORES = {
    "latihan_jadwal": 3,
    "kegiatan_tambahan": 4,
}
SLEEP_SCORES = {
    "19_20": 3,
    "20_21": 2,
    "21_22": 1,
    "22_midnight": -3,
}
WAKE_SCORES = {
    "03_04": 3,
    "04_05": 2,
    "05_06": 1,
    "06_noon": -3,
}
PENGEMBANGAN_MAX = 13  # (3 + 4) + 3 + 3

TOTAL_MAX = IBADAH_MAX + BELAJAR_MAX + AKHLAK_MAX + PENGEMBANGAN_MAX  # 87


def calculate_ibadah_score(prayers: Dict[str, str]) -> int:
    score = 0
    waktu_list = ["subuh", "dzuhur", "ashar", "maghrib", "isya"]
    for w in waktu_list:
        val = prayers.get(w, "")
        score += IBADAH_SCORES.get(val, 0)
    return score


def calculate_belajar_score(items: List[str]) -> int:
    score = 0
    for item in set(items or []):
        score += BELAJAR_SCORES.get(item, 0)
    return min(score, BELAJAR_MAX)


def calculate_akhlak_score(items: List[str]) -> int:
    score = 0
    for item in set(items or []):
        score += AKHLAK_SCORES.get(item, 0)
    return min(score, AKHLAK_MAX)


def calculate_pengembangan_score(ekskul_items: List[str], sleep_window: str, wake_window: str) -> int:
    score = 0
    for item in set(ekskul_items or []):
        score += PENGEMBANGAN_EKSKUL_SCORES.get(item, 0)
    score += SLEEP_SCORES.get(sleep_window, 0)
    score += WAKE_SCORES.get(wake_window, 0)
    return score


def calculate_daily_journal_scores(answers: Dict[str, Any]) -> Dict[str, Any]:
    """
    Menghitung skor keseluruhan dari data input jurnal v2.
    answers: {
        "ibadah": {"subuh": "jamaah", ...},
        "belajar": ["tugas_selesai", ...],
        "akhlak": ["bersih_rumah", ...],
        "pengembangan": {
            "ekskul": ["latihan_jadwal"],
            "sleep_window": "20_21",
            "wake_window": "04_05"
        }
    }
    """
    ibadah_data = answers.get("ibadah", {})
    belajar_items = answers.get("belajar", [])
    akhlak_items = answers.get("akhlak", [])
    pengembangan_data = answers.get("pengembangan", {})

    score_ibadah = calculate_ibadah_score(ibadah_data)
    score_belajar = calculate_belajar_score(belajar_items)
    score_akhlak = calculate_akhlak_score(akhlak_items)
    score_pengembangan = calculate_pengembangan_score(
        pengembangan_data.get("ekskul", []),
        pengembangan_data.get("sleep_window", ""),
        pengembangan_data.get("wake_window", ""),
    )

    total_score = score_ibadah + score_belajar + score_akhlak + score_pengembangan

    return {
        "ibadah": score_ibadah,
        "belajar": score_belajar,
        "akhlak": score_akhlak,
        "pengembangan": score_pengembangan,
        "total": total_score,
        "max": TOTAL_MAX,
        "percentage": round((max(0, total_score) / TOTAL_MAX) * 100, 1) if TOTAL_MAX else 0.0,
    }


def calculate_v1_legacy_score(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Memetakan laporan format lama (v1) ke skor v2 jika ada data lama.
    """
    ibadah_data = {
        w: doc.get(w, "") for w in ["subuh", "dzuhur", "ashar", "maghrib", "isya"]
    }
    # Pemetaan kasar v1 ke indikator v2
    score_ibadah = calculate_ibadah_score(ibadah_data)

    parent_acts = doc.get("parent_activities", [])
    score_akhlak = min(len(parent_acts) * 3, AKHLAK_MAX)

    study_acts = doc.get("study_activities", [])
    score_belajar = min(len(study_acts) * 4, BELAJAR_MAX)

    score_pengembangan = calculate_pengembangan_score(
        [],
        doc.get("sleep_window", ""),
        doc.get("wake_window", ""),
    )

    total = score_ibadah + score_belajar + score_akhlak + score_pengembangan
    return {
        "ibadah": score_ibadah,
        "belajar": score_belajar,
        "akhlak": score_akhlak,
        "pengembangan": score_pengembangan,
        "total": total,
        "max": TOTAL_MAX,
        "percentage": round((max(0, total) / TOTAL_MAX) * 100, 1),
    }
