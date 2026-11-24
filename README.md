# SI-SANTRI v2 — SMP Negeri 2 Panji

Sistem Informasi Monitoring Ibadah, Pembiasaan Karakter, dan Pembinaan Siswa (**SI-SANTRI**) untuk **SMP Negeri 2 Panji** dengan 4 peran pengguna: **Siswa**, **Guru Wali**, **Wali Murid**, dan **Admin Sekolah**.

> **Catatan Backend:** Untuk sementara, `frontend/.env` masih mengarah ke server backend online pengembang agar aplikasi bisa langsung diuji coba. Jika pihak sekolah ingin memindahkan backend ke server/cloud milik sendiri, ikuti panduan di bawah ini.

---

## Struktur Repository

- `frontend/` — Aplikasi mobile & web berbasis **React Native (Expo SDK 57 / Expo Router)**.
- `backend/` — REST API berbasis **FastAPI + MongoDB (Motor)** lengkap dengan auto-seeding data awal (`backend/data/seed_data_santri.json`) dan `Dockerfile`.
- [PANDUAN_PENGGUNA.md](PANDUAN_PENGGUNA.md) — Panduan operasional aplikasi untuk Admin, Guru Wali, Siswa, dan Wali Murid.

---

## 1. Menjalankan Backend Sendiri (FastAPI + MongoDB)

### Prasyarat
- **Python 3.10+**
- Database **MongoDB** (lokal atau **MongoDB Atlas**)

### A. Menjalankan Langsung (Python / Virtual Environment)
1. Masuk ke folder `backend`:
   ```bash
   cd backend
   ```
2. Buat virtual environment (disarankan) dan aktifkan:
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # Linux / macOS:
   source .venv/bin/activate
   ```
3. Install seluruh dependensi Python:
   ```bash
   pip install -r requirements.txt
   ```
4. Salin file template environment menjadi `.env`:
   ```bash
   # Windows PowerShell:
   Copy-Item .env.example .env
   # Linux / macOS:
   cp .env.example .env
   ```
5. Buka `backend/.env` dan isi nilainya:
   - `MONGO_URL` *(wajib)*: Connection string MongoDB / MongoDB Atlas Anda.
   - `DB_NAME` *(wajib)*: Nama database, misalnya `si_santri_db`.
   - `JWT_SECRET` *(wajib)*: String acak panjang dan rahasia untuk penandatanganan token login.
   - `ACCESS_TOKEN_EXPIRE_MINUTES` *(opsional, default `720`)*: Masa berlaku sesi login (dalam menit).
   - `DEFAULT_PASSWORD` *(opsional, default `password123`)*: Password bawaan akun baru / reset password oleh Admin.
6. Jalankan server API:
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 7860
   ```
   Saat pertama kali menyala pada database kosong, backend akan otomatis mengisi data awal kelas, guru, dan siswa dari `backend/data/seed_data_santri.json`.
7. Uji API melalui browser:
   - Health check: `http://localhost:7860/api/`
   - Dokumentasi Swagger: `http://localhost:7860/docs`

### B. Deploy Menggunakan Docker / Hugging Face Spaces
Tersedia [backend/Dockerfile](backend/Dockerfile) (berbasis `python:3.10-slim`, port `7860`, entrypoint `uvicorn server:app`).
```bash
cd backend
docker build -t si-santri-api .
docker run -d -p 7860:7860 --env-file .env --name si-santri-api si-santri-api
```
Jika deploy ke **Hugging Face Spaces (Docker)** atau layanan cloud lain (Railway, Render, VPS), pastikan seluruh variabel dari `backend/.env.example` dimasukkan sebagai **Environment Variables / Secrets** di dashboard platform tersebut.

---

## 2. Menghubungkan & Menjalankan Frontend (Expo / Android APK)

### Prasyarat
- **Node.js** & **Yarn** (`1.22.x`)

### Langkah Setup
1. Masuk ke folder `frontend` dan install dependensi:
   ```bash
   cd frontend
   yarn install
   ```
2. Arahkan URL API ke server backend milik Anda dengan mengedit file `frontend/.env`:
   ```env
   EXPO_PUBLIC_BACKEND_URL=https://domain-backend-anda.com
   EXPO_USE_FAST_RESOLVER="1"
   ```
3. Jalankan aplikasi di mode pengembangan:
   ```bash
   yarn start
   ```
4. Untuk membuat file APK Android melalui **Expo Application Services (EAS)** (konfigurasi tersedia di [frontend/eas.json](frontend/eas.json)):
   ```bash
   npx eas-cli login
   npx eas-cli build -p android --profile preview
   ```
   *(Gunakan `--profile production` untuk build rilis produksi.)*

---

## 3. Panduan Pemakaian Aplikasi

Untuk petunjuk lengkap login, pengisian jurnal harian siswa, pemantauan guru wali, konfirmasi orang tua, hingga pengelolaan data oleh Admin Sekolah, silakan baca [PANDUAN_PENGGUNA.md](PANDUAN_PENGGUNA.md).
