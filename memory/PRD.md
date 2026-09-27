# SI SANTRI — SMP NEGERI 2 PANJI

## Problem Statement
Bangun aplikasi mobile "SI SANTRI (sistem pengawasan tingkah laku sehari hari)" untuk SMP NEGERI 2 PANJI.
Sistem monitoring kegiatan harian siswa (pengganti Google Form + rekap manual) dengan 3 role:
Siswa (login NIPD), Guru Wali (login nama_lengkap), Wali Murid (login nama_lengkap siswa).
Data riil pre-seeded: 398 siswa, 19 guru wali, 398 wali murid, 9 kelas (7A-7D, 8A-8E).
Database: MongoDB Atlas (connection string diberikan user).

## User Choices (dari ask_human)
1. Database: MongoDB Atlas eksternal (connection string user) — digunakan langsung.
2. Autentikasi: bcrypt password hashing + JWT session.
3. Fitur "Tambah Siswa Baru": bisa diakses oleh Guru Wali untuk binaannya sendiri.
4. Rekap visual: progress bar & angka ringkas (bukan chart library).

## Architecture
- Backend: FastAPI + Motor (async MongoDB driver), JWT auth (PyJWT), bcrypt via passlib.
- Database: MongoDB Atlas `si_santri` (connection string in backend/.env MONGO_URL).
  - Collections: classes, teachers, students, parents, users, daily_reports.
  - Auto-seed on startup from backend/data/seed_data_santri.json (skips if `users` non-empty).
  - Standalone seeder: /app/seed_mongo.py (supports --force to wipe & reseed).
  - NOTE: The Atlas DB initially had legacy pre-seeded data (plaintext passwords, different
    schema/_id conventions) matching the spec's described default state. This was wiped and
    re-seeded with our own bcrypt-hashed schema for security consistency (per user's choice #2).
- Frontend: Expo Router (file-based routing), React Native, SecureStore-backed AsyncStorage
  wrapper (`src/utils/storage`) for session persistence (cross-platform native+web).
- Timezone: Asia/Jakarta (WIB) via `zoneinfo.ZoneInfo` for all date/time logic.

## Core Requirements (static)
- Login page with role switcher (Siswa/Guru Wali/Wali Murid), dynamic labels, smart
  snake_case normalization for guru/wali_murid identifiers, quick-fill demo chips.
- Student: 5-step daily activity wizard (Sholat 5 waktu, Tidur/Bangun, Nutrisi, Kegiatan
  Ortu, Belajar), dashboard with today status + backfill, history, account.
- Teacher: dashboard KPI (total/sudah/belum/persentase), search+filter student list,
  student detail with 7/30 day recap, "Tambah Siswa Baru" modal.
- Parent: dashboard for exactly 1 linked child, today status, 7/30 day summary, history.
- Strict data isolation enforced server-side (role-based dependency injection per endpoint).
- One report per (student_id, activity_date) — upsert logic, submitted_late flag computed
  server-side (submission date > activity_date).

## What's Been Implemented (2026-02-27, session 1)
- Backend: auth_utils.py (JWT, bcrypt, normalize_identifier), database.py, seed_logic.py,
  routes/{auth,student,teacher,parent}.py, server.py. All endpoints tested via curl:
  login (3 roles + normalization + wrong password), student dashboard/reports (upsert
  verified no duplication), teacher dashboard/students/detail, parent dashboard/summary,
  RBAC isolation (403 for cross-role access).
- Frontend: AuthContext (persisted session via storage wrapper), Toast system, ConfirmSheet,
  reusable UI kit (Button/Chip/Card/Badge/ProgressBar), login screen, student tabs
  (home/form wizard/history/account), teacher tabs (dashboard/account) + student detail +
  add-student modal, parent tabs (home/history/account), backfill screen.
- Verified via screenshot: login screen renders correctly (role switcher + demo chips),
  student login flow works end-to-end (dashboard shows correct name/class/teacher + backfill).
- Seed data verified: 9 classes, 19 teachers, 398 students, 398 parents, 815 users in MongoDB.

## Known Data Quirks
- One duplicate student name/username exists in seed_data_santri.json ("Dika Maulid Putra",
  P023 in 8A vs P150 in 7D with nipd "8584-7D") — wali_murid username uniqueness is NOT
  strictly enforced (only guru usernames are unique-indexed) to avoid seeding crash.

## Testing Results (2026-02-27, session 1)
- Full testing_agent_v3_expo pass: Backend 29/29 checks passed. Frontend all core flows
  passed (login x3 roles + normalization, wizard 5-step submission + edit-no-duplicate,
  backfill, teacher dashboard/search/filter/detail, add-student, parent view, RBAC 403
  isolation, responsive layouts).
- Fixed after testing: N+1 query performance issue in teacher.py (list_students and
  compute_recap now use batched $in queries instead of per-student find_one loops) —
  verified /teacher/students and /teacher/students/{id} now respond in ~1s instead of 6-15s.
  Fixed Card component to forward testID prop. Cleaned up TEST_ artifact student created
  during testing and reset daily_reports collection to empty for a clean initial state.
- Known minor/deferred issue: a cosmetic "Unexpected text node" React-Native-Web console
  warning appears on teacher student-detail screen (web preview only, does not affect
  native iOS/Android rendering or functionality — data displays correctly). Root source
  not pinpointed after investigation; non-blocking.


- P0: Full end-to-end testing agent pass (login all 3 roles, form submission, backfill,
  teacher detail, parent view, isolation checks, add-student flow).
- P1: Date picker for teacher dashboard (currently defaults to today only, no historical
  date navigation in KPI/list view).
- P1: Monthly recap view (currently only 7/30 day aggregate stats, no calendar view).
- P2: Additional seeder script formats mentioned in spec (seed.js, seed_data_santri.sql,
  input_siswa.py) — deferred since MongoDB auto-seed + seed_mongo.py covers the core
  requirement; SQL/SQLite variants not needed since app uses MongoDB exclusively.
- P2: WhatsApp/push notification reminders (mentioned in future-roadmap.md, out of MVP scope).
