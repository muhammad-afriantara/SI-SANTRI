# 📖 PANDUAN LENGKAP PENGGUNAAN APLIKASI SI-SANTRI
**Sistem Pengawasan Tingkah Laku Sehari-hari Santri / Siswa**  
**SMP NEGERI 2 PANJI**

---

## 📌 DAFTAR ISI
1. [Tentang Aplikasi](#1-tentang-aplikasi)
2. [Panduan Instalasi Aplikasi di HP Android (.APK)](#2-panduan-instalasi-aplikasi-di-hp-android-apk)
3. [Panduan Login & Hak Akses (3 Peran)](#3-panduan-login--hak-akses)
4. [Panduan Pengguna: SISWA (Santri)](#4-panduan-pengguna-siswa-santri)
5. [Panduan Pengguna: GURU WALI (Wali Kelas)](#5-panduan-pengguna-guru-wali)
6. [Panduan Pengguna: WALI MURID (Orang Tua)](#6-panduan-pengguna-wali-murid)
7. [Tanya Jawab (FAQ) & Penyelesaian Masalah](#7-tanya-jawab-faq--penyelesaian-masalah)

---

## 1. Tentang Aplikasi

**SI-SANTRI** adalah platform digital monitoring terpadu yang dirancang khusus untuk **SMP Negeri 2 Panji** guna memantau, membimbing, dan membentuk karakter serta kebiasaan positif santri/siswa sehari-hari, baik di lingkungan sekolah maupun di rumah.

Aplikasi ini menghubungkan tiga pihak secara *real-time*:
- **Siswa (Santri)**: Mengisi jurnal pembiasaan dan ibadah harian mandiri.
- **Guru Wali**: Memantau kedisiplinan dan rekap kepatuhan siswa binaan satu kelas.
- **Wali Murid**: Memantau perkembangan ibadah dan aktivitas harian anaknya dari rumah.

Infrastruktur aplikasi telah didukung oleh server cloud **FastAPI** dan database **MongoDB Atlas** yang aktif 24 jam nonstop.

---

## 2. Panduan Instalasi Aplikasi di HP Android (.APK)

Aplikasi **SI-SANTRI** didistribusikan dalam bentuk file instalasi mandiri (**`.apk`**) yang dapat dipasang langsung di HP Android guru, siswa, maupun wali murid tanpa melalui Google Play Store:

1. **Download File APK**:
   - Download file APK resmi SI-SANTRI yang dibagikan oleh pihak sekolah (misalnya via WhatsApp/Google Drive dengan nama `SI-SANTRI.apk`).
2. **Izinkan Instalasi dari Sumber Tidak Dikenal**:
   - Saat file APK diklik/dibuka, jika muncul notifikasi *"Demi keamanan, ponsel Anda tidak diizinkan menginstal aplikasi tidak dikenal dari sumber ini"*:
   - Klik **Setelan / Pengaturan (Settings)** ➡️ aktifkan centang **"Izinkan dari sumber ini (Allow from this source)"**.
3. **Peringatan Google Play Protect**:
   - Jika muncul popup Google Play Protect bertuliskan *"Aplikasi diblokir"* (hal ini wajar karena aplikasi dibuat khusus untuk internal sekolah dan belum didaftarkan komersial di Google Play Store):
   - Klik tulisan **"Detail selengkapnya (More details)"** ➡️ pilih **"Tetap instal (Install anyway)"**.
4. **Selesai**:
   - Ikon aplikasi dengan nama **SI-SANTRI** akan muncul di layar menu HP Anda dan siap digunakan.

---

## 3. Panduan Login & Hak Akses

Halaman login SI-SANTRI dilengkapi dengan **Pemilih Peran (Role Selector)** di bagian atas:
1. **Siswa**
2. **Guru Wali**
3. **Wali Murid**

> ⚠️ **PENTING**: Pastikan Anda memilih tab peran yang sesuai sebelum memasukkan identitas login!

```
┌────────────────────────────────────────────────────────┐
│                      SI SANTRI                         │
│       SMP NEGERI 2 PANJI - SISTEM MONITORING           │
├────────────────────────────────────────────────────────┤
│     [ SISWA ]    │   [ GURU WALI ]   │ [ WALI MURID ]  │
├────────────────────────────────────────────────────────┤
│ Identitas Login  : [                                 ] │
│ Kata Sandi       : [                               ] 👁 │
│                    [   TOMBOL MASUK   ]                │
└────────────────────────────────────────────────────────┘
```

### Informasi Akun & Password:
- **Password Default (Awal)**: `password123`
- Untuk keamanan, setiap pengguna disarankan segera mengubah kata sandi setelah berhasil login pertama kali.

---

## 4. Panduan Pengguna: SISWA (Santri)

### A. Cara Login Siswa
1. Pilih tab **"Siswa"**.
2. Masukkan **NIPD (Nomor Induk Peserta Didik)** Anda (contoh: `8459`).
3. Masukkan password (default: `password123`).
4. Klik **Masuk**.

---

### B. Dashboard Siswa
Setelah login, Anda akan melihat:
- **Sapaan & Profil Siswa**: Nama lengkap, kelas, dan NIPD Anda.
- **Status Jurnal Hari Ini**: Menampilkan indikator apakah Anda sudah mengisi kegiatan hari ini atau belum.
- **Kartu Ringkasan Kepatuhan (7 Hari & 30 Hari)**: Menampilkan persentase kepatuhan sholat fardhu berjamaah dan tadarus Al-Qur'an.
- **Tombol "Isi Jurnal Hari Ini"**: Tombol utama untuk memulai pengisian aktivitas.

---

### C. Mengisi Jurnal Harian (5 Modul Pembiasaan)
Pengisian jurnal harian dibagi menjadi 5 modul sederhana yang dipandu dengan *progress bar*:

#### 1. Modul Sholat Fardhu & Sunnah 🕌
- **Sholat 5 Waktu** (Subuh, Dzuhur, Ashar, Maghrib, Isya):
  Pilih salah satu status untuk setiap waktu sholat:
  - **Berjamaah** (di masjid/musholla/bersama keluarga).
  - **Munfarid** (sholat sendirian tepat waktu).
  - **Tidak Sholat / Uzur** (bagi santriwati yang sedang berhalangan/haid).
- **Sholat Sunnah**:
  - Centang jika Anda melaksanakan **Sholat Dhuha** atau **Sholat Tahajjud**.

#### 2. Modul Pola Istirahat (Tidur & Bangun) ⏰
- **Jam Tidur Malam**: Catat jam berapa Anda mulai tidur (contoh: 21.30 WIB).
- **Jam Bangun Pagi**: Catat jam berapa Anda bangun untuk bersiap sholat Subuh (contoh: 04.15 WIB).
- *Tujuan*: Membiasakan pola hidup teratur dan tidak begadang.

#### 3. Modul Pola Nutrisi & Puasa 🍽️
- Catat pola makan harian: **Sarapan Pagi**, **Makan Siang**, dan **Makan Malam**.
- Centang jika menjalankan **Puasa Sunnah** (Senin-Kamis / Daud).
- Konsumsi air putih yang cukup.

#### 4. Modul Berbakti kepada Orang Tua 👨‍👩‍👧‍👦
- Catat kegiatan membantu orang tua di rumah, misalnya:
  - Membersihkan kamar tidur / menyapu rumah.
  - Membantu memasak / mencuci piring.
  - Berpamitan dan mencium tangan orang tua saat keluar rumah.

#### 5. Modul Belajar & Mengaji 📖
- **Tadarus Al-Qur'an / Juz 'Amma**:
  - Catat nama surat dan ayat yang dibaca hari ini (contoh: *Surat Al-Baqarah ayat 1-20*).
- **Belajar Mandiri / Mengerjakan Tugas Sekolah**:
  - Catat durasi dan mata pelajaran yang dipelajari malam ini.

---

### D. Fitur Pengisian Hari yang Terlewat (*Backfill*)
Jika kemarin Anda lupa mengisi jurnal harian:
1. Di halaman jurnal, pilih tanggal kegiatan yang ingin diisi (tersedia pemilih tanggal mundur).
2. Isi data seperti biasa dan kirim.
3. Sistem akan menandai laporan tersebut dengan label *"Diisi Terlambat (Backfill)"* agar transparansi tetap terjaga bagi guru dan orang tua.

---

### E. Memperbarui Data (*Edit / Upsert*)
Jika ada data yang salah input di hari yang sama:
- Anda cukup mengisi ulang formulir tanggal tersebut dan menyimpannya kembali. Sistem otomatis memperbarui data lama tanpa membuat data ganda (*anti-duplicate*).

---

## 5. Panduan Pengguna: GURU WALI (Wali Kelas)

Guru Wali berperan sebagai pembimbing utama yang memantau perkembangan seluruh santri di kelas binaannya.

### A. Cara Login Guru Wali
1. Pilih tab **"Guru Wali"**.
2. Masukkan **Nama Lengkap Guru** (bisa mengetik nama biasa atau format `nama_lengkap`, contoh: `catur_anjar_anggraini`).
3. Masukkan password (default: `password123`).
4. Klik **Masuk**.

---

### B. Dashboard Monitoring Kelas
Dashboard Guru Wali menyajikan ringkasan instan kondisi kelas hari ini:
- **Kartu KPI Hari Ini**:
  - Total jumlah siswa binaan di kelas.
  - Berapa siswa yang **Sudah Mengisi** jurnal hari ini.
  - Berapa siswa yang **Belum Mengisi** jurnal hari ini.
  - Rata-rata persentase sholat berjamaah kelas.
- **Filter Cepat**:
  - Tombol filter: **Semua**, **Sudah Isi**, dan **Belum Isi** untuk memudahkan identifikasi santri yang lalai.
- **Pencarian Siswa**:
  - Kotak pencarian untuk mencari nama atau NIPD siswa tertentu secara cepat.

---

### C. Melihat Detail & Riwayat Siswa
Klik pada nama salah satu siswa untuk membuka halaman rekap individual:
1. **Profil Siswa**: NIPD, nama lengkap, kontak wali murid.
2. **Grafik Kepatuhan 7 Hari & 30 Hari Terakhir**:
   - Tren sholat 5 waktu berjamaah.
   - Kedisiplinan bangun shubuh dan mengaji.
3. **Log Harian Siswa**:
   - Membaca catatan detail apa saja yang dilakukan siswa pada tanggal tertentu (sholat apa saja, surat Al-Qur'an apa yang dibaca, dsb).

---

### D. Menambahkan Siswa Baru
Guru Wali dapat menambahkan siswa baru ke kelas binaannya secara mandiri:
1. Klik tombol **"+ Tambah Siswa Baru"** di dashboard.
2. Masukkan data siswa:
   - **NIPD**: Nomor Induk Siswa (harus unik).
   - **Nama Lengkap Siswa**.
   - **Nama Lengkap Wali Murid**.
   - **Nomor Kontak / WhatsApp** (opsional).
3. Klik **Simpan**.
4. **Sistem Otomatis**:
   - Akun siswa baru langsung dibuat (Login pakai NIPD).
   - Akun wali murid langsung otomatis dibuatkan (Login pakai nama anak).
   - Password awal kedua akun otomatis diset ke `password123`.

---

## 6. Panduan Pengguna: WALI MURID (Orang Tua)

Aplikasi SI-SANTRI memberikan akses transparansi penuh bagi orang tua untuk memantau kejujuran dan kebiasaan ibadah anak di luar pantauan langsung.

### A. Cara Login Wali Murid
1. Pilih tab **"Wali Murid"**.
2. Masukkan **Nama Lengkap Anak Anda** (bisa mengetik biasa atau format `nama_lengkap`, contoh: `afika_putri_rievylia`).
3. Masukkan password (default: `password123`).
4. Klik **Masuk**.

---

### B. Dashboard Orang Tua
Untuk menjaga privasi, **orang tua hanya dapat melihat data anaknya sendiri** (terisolasi secara ketat):
- **Status Hari Ini**: Melihat apakah anak Anda sudah mengisi jurnal harian hari ini.
- **Rincian Ibadah Hari Ini**:
  - Apakah anak sholat Subuh, Dzuhur, Ashar, Maghrib, dan Isya berjamaah atau tidak.
  - Surat Al-Qur'an apa yang dibaca anak hari ini.
  - Apakah anak mencatat jam tidur dan bangun secara teratur.
- **Ringkasan Kepatuhan 7 & 30 Hari**:
  - Persentase kepatuhan ibadah anak dalam 1 minggu dan 1 bulan terakhir.
  - Membantu orang tua saat evaluasi bersama guru wali kelas.

---

## 7. Tanya Jawab (FAQ) & Penyelesaian Masalah

### Q1: Apakah aplikasi ini membutuhkan koneksi internet?
**Jawab**: Ya. Karena data disinkronkan secara langsung ke server cloud dan database sekolah, HP Anda memerlukan koneksi internet (bisa menggunakan kuota data seluler maupun Wi-Fi).

---

### Q2: Bagaimana jika lupa kata sandi (*Password*)?
**Jawab**:
- Untuk **Siswa** dan **Wali Murid**: Silakan menghubungi **Guru Wali Kelas** masing-masing untuk mereset kata sandi ke setelan default (`password123`).
- Untuk **Guru Wali**: Silakan menghubungi Administrator Sistem IT Sekolah.

---

### Q3: Apakah santriwati yang sedang haid/uzur tetap harus mengisi jurnal?
**Jawab**: Ya, tetap harus mengisi. Pada modul sholat, pilih opsi **"Tidak Sholat / Uzur"**. Dengan begitu, status jurnal hari ini tetap tercatat sudah mengisi dan tidak menurunkan nilai kepatuhan karena faktor syar'i.

---

### Q4: Apakah data yang sudah terisi kemarin bisa diubah jika ada kekeliruan?
**Jawab**: Bisa. Buka formulir pada tanggal yang ingin diperbaiki, lakukan perubahan, lalu simpan kembali. Data di server akan langsung terupdate dengan data terbaru.

---

### Q5: Saat pertama kali install APK di HP, muncul peringatan "Play Protect". Apakah aplikasi ini berbahaya?
**Jawab**: **Sama sekali tidak berbahaya.** Peringatan tersebut muncul murni karena aplikasi di-compile langsung untuk keperluan internal SMP Negeri 2 Panji dan belum dipublikasikan secara komersial di Google Play Store publik. Cukup pilih **"Tetap Instal (Install anyway)"**.

---

<br>

**SI-SANTRI — SMP NEGERI 2 PANJI**  
*Membangun Karakter Santri Disiplin, Jujur, dan Berakhlakul Karimah.*
