# 📖 PANDUAN PENGGUNAAN APLIKASI SI-SANTRI
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

### Informasi Akun & Kata Sandi:
- **Kata Sandi Default**: `password123` (berlaku untuk semua pengguna awal).

---

## 4. Panduan Pengguna: SISWA (Santri)

### A. Cara Login Siswa
1. Pilih tab **"Siswa"**.
2. Masukkan **NIPD (Nomor Induk Peserta Didik)** Anda (contoh: `8459`).
3. Masukkan kata sandi (default: `password123`).
4. Klik **Masuk**.

---

### B. Dashboard Siswa
Setelah login, santri akan melihat:
- **Kartu Profil**: Nama lengkap, kelas, dan NIPD santri.
- **Status Jurnal Hari Ini**:
  - Tanda **"Sudah Mengisi"** (jika sudah tuntas hari ini).
  - Tanda **"Belum Mengisi"** (jika belum mengisi hari ini).
- **Banner Peringatan Hari Terlewat**: Menampilkan jumlah hari yang terlewat (jika ada) dan tombol untuk melengkapinya.
- **Kartu Ringkasan Kepatuhan Sholat Berjamaah**: Menampilkan persentase sholat berjamaah dalam **7 Hari** dan **30 Hari** terakhir.
- **Tombol Aksi Utama**:
  - Tombol **"Isi Kegiatan Hari Ini"** (atau *"Ubah Kegiatan Hari Ini"* jika ingin mengedit).

---

### C. Mengisi Jurnal Harian (5 Tahapan Form)
Pengisian formulir dipandu dengan *progress bar* yang terbagi menjadi 5 bagian:

#### 1. Tahap A: Sholat Fardhu 5 Waktu 🕌
Untuk setiap waktu sholat (**Subuh**, **Dzuhur**, **Ashar**, **Maghrib**, **Isya**), santri memilih salah satu dari 4 pilihan tombol:
- **Berjamaah**: Melaksanakan sholat secara berjamaah di masjid/musholla/rumah.
- **Munfarid**: Melaksanakan sholat sendirian tepat waktu.
- **Berhalangan**: Khusus santriwati yang berhalangan/uzur syar'i (haid).
- **Tidak Sholat**: Jika meninggalkan sholat.

#### 2. Tahap B: Waktu Tidur & Bangun ⏰
Santri memilih rentang jam istirahat yang tersedia:
- **Waktu Tidur Malam**:
  - `19.00 – 20.00`
  - `20.00 – 21.00`
  - `21.00 – 22.00`
  - `22.00 – tengah malam`
- **Waktu Bangun Pagi**:
  - `03.00 – 04.00`
  - `04.00 – 05.00`
  - `05.00 – 06.00`
  - `06.00 – siang`

#### 3. Tahap C: Makan Bergizi (Nutrisi) 🍽️
Santri mencentang zat gizi yang dikonsumsi hari ini (bisa memilih lebih dari satu):
- ☑️ **Karbohidrat** (Nasi, roti, kentang, jagung, dll).
- ☑️ **Protein** (Ikan, ayam, telur, tempe, tahu, daging, dll).
- ☑️ **Vitamin** (Sayur-mayur dan buah-buahan).

#### 4. Tahap D: Kegiatan Bersama Orang Tua 👨‍👩‍👧‍👦
Santri memilih kegiatan berbakti / membantu orang tua di rumah (bisa memilih lebih dari satu):
- ☑️ Membersihkan kamar/ruang tamu/dapur
- ☑️ Membersihkan halaman dan ruangan lain
- ☑️ Mencuci piring / mencuci baju / mencuci kendaraan dan lain-lain
- ☑️ Memasak / belanja / menyiapkan makanan dan lain-lain
- ☑️ Menjaga adik / keluarga dan lain-lain
- ☑️ Berkebun / merawat hewan peliharaan dan lain-lain
- ☑️ Membantu orang tua bekerja dan lain-lain
- ☑️ **Lainnya** *(jika dicentang, akan muncul kolom teks untuk mengetik kegiatan sendiri)*.

#### 5. Tahap E: Aktivitas Belajar 📖
Santri memilih aktivitas belajar yang dilakukan hari ini (bisa memilih lebih dari satu):
- ☑️ Mengerjakan tugas/PR
- ☑️ Membaca materi pelajaran
- ☑️ Menyimak materi pelajaran (video pembelajaran)
- ☑️ Menulis/mencatat materi
- ☑️ Ekstrakurikuler sekolah
- ☑️ **Kegiatan non akademik lainnya** *(jika dicentang, akan muncul kolom teks untuk mengetik kegiatan sendiri)*.

---

### D. Fitur "Lengkapi Hari Terlewat" (Backfill)
Jika santri lupa mengisi jurnal pada hari-hari sebelumnya:
1. Di dashboard siswa, ketuk banner / tombol **"Lengkapi Hari Terlewat"**.
2. Aplikasi akan membuka layar khusus yang menampilkan **daftar tanggal-tanggal yang terlewat**.
3. Ketuk tanggal yang ingin dilengkapi, isi formulir 5 tahap, lalu simpan.
4. Laporan akan tersimpan dengan tanda *"Diisi Terlambat (Backfill)"*.

---

### E. Memperbarui Data (Edit Data)
Jika ada kekeliruan data yang sudah disimpan pada hari yang sama:
- Cukup buka kembali formulir hari tersebut (tombol *"Ubah Kegiatan Hari Ini"*), perbaiki pilihan, lalu kirim ulang. Sistem otomatis memperbarui data lama tanpa membuat data ganda (*anti-duplicate*).

---

## 5. Panduan Pengguna: GURU WALI (Wali Kelas)

### A. Cara Login Guru Wali
1. Pilih tab **"Guru Wali"**.
2. Masukkan **Nama Lengkap Guru** (bisa mengetik nama biasa atau format `nama_lengkap`, contoh: `catur_anjar_anggraini`).
3. Masukkan kata sandi (default: `password123`).
4. Klik **Masuk**.

---

### B. Dashboard Monitoring Kelas
Dashboard Guru Wali menyajikan rekap monitoring seluruh siswa binaan:
- **Header**: Nama Guru Wali dan tombol **"+ Siswa"** (untuk menambah santri baru).
- **Kartu KPI Kelas**:
  - Total jumlah siswa binaan.
  - Jumlah siswa yang **Sudah Mengisi** jurnal hari ini.
  - Jumlah siswa yang **Belum Mengisi** jurnal hari ini.
  - Rata-rata persentase kepatuhan sholat berjamaah kelas.
- **Filter Cepat**:
  - Tombol filter status: **Semua**, **Sudah**, dan **Belum**.
- **Pencarian Siswa**:
  - Kolom pencarian untuk mencari nama atau NIPD santri secara langsung.

---

### C. Melihat Rekap & Log Individual Siswa
Ketuk kartu nama santri pada daftar untuk membuka rincian lengkap:
1. **Profil Siswa**: Nama lengkap, NIPD, dan kelas.
2. **Kartu Rekapitulasi Kepatuhan**:
   - Persentase sholat berjamaah selama **7 Hari** terakhir.
   - Persentase sholat berjamaah selama **30 Hari** terakhir.
3. **Rincian Jurnal Tanggal Terpilih**:
   - Status waktu pengisian (dan label *"Terlambat mengisi"* jika backfill).
   - Rincian status sholat Subuh, Dzuhur, Ashar, Maghrib, Isya.
   - Jam tidur malam dan jam bangun pagi.
   - Pilihan nutrisi yang dikonsumsi.
   - Kegiatan bersama orang tua (beserta catatan khusus jika ada).
   - Aktivitas belajar (beserta catatan khusus jika ada).

---

### D. Menambahkan Siswa Baru
Guru Wali dapat mendaftarkan siswa baru ke kelas binaannya:
1. Klik tombol **"+ Siswa"** di pojok kanan atas dashboard.
2. Isi formulir pendaftaran:
   - **Nama Lengkap**: Nama lengkap siswa baru (contoh: *Budi Setiawan*).
   - **NIPD**: Nomor Induk Siswa (wajib unik).
   - **Kelas**: Pilih chip kelas yang sesuai (`7A`, `7B`, `7C`, `7D`, `8A`, `8B`, `8C`, `8D`, `8E`).
3. Klik **Simpan**.
4. **Sistem Otomatis**:
   - Akun Siswa langsung aktif (Login: NIPD).
   - Akun Wali Murid otomatis dibuatkan (Login: Nama Lengkap Siswa).
   - Password kedua akun otomatis diset ke `password123`.

---

## 6. Panduan Pengguna: WALI MURID (Orang Tua)

### A. Cara Login Wali Murid
1. Pilih tab **"Wali Murid"**.
2. Masukkan **Nama Lengkap Anak Anda** (bisa mengetik biasa atau format `nama_lengkap`, contoh: `afika_putri_rievylia`).
3. Masukkan kata sandi (default: `password123`).
4. Klik **Masuk**.

---

### B. Dashboard Orang Tua
Orang tua mendapatkan akses khusus yang terisolasi aman (**hanya dapat memantau data anaknya sendiri**):
- **Kartu Identitas Anak**: Menampilkan nama anak, kelas, NIPD, serta nama Guru Wali kelasnya.
- **Status Pengisian Hari Ini**:
  - Kotak hijau: *"Sudah mengisi kegiatan hari ini"* (disertai jam pengisian).
  - Kotak kuning: *"Belum mengisi kegiatan hari ini"*.
- **Rincian Sholat & Istirahat Hari Ini**:
  - Status setiap waktu sholat (Subuh, Dzuhur, Ashar, Maghrib, Isya).
  - Jam tidur malam dan bangun pagi anak.
- **Grafik Kepatuhan Sholat Berjamaah**:
  - Persentase sholat berjamaah anak selama **7 Hari** terakhir.
  - Persentase sholat berjamaah anak selama **30 Hari** terakhir.

---

## 7. Tanya Jawab (FAQ) & Penyelesaian Masalah

### Q1: Apakah aplikasi ini membutuhkan koneksi internet?
**Jawab**: Ya. Data tersimpan di server cloud dan database MongoDB Atlas, sehingga HP membutuhkan koneksi internet (kuota data seluler atau Wi-Fi).

---

### Q2: Mengapa muncul peringatan "Play Protect" saat install APK?
**Jawab**: Peringatan ini normal karena aplikasi di-compile langsung untuk internal SMP Negeri 2 Panji dan tidak didistribusikan lewat Google Play Store publik. Cukup klik **"Detail selengkapnya"** ➡️ **"Tetap instal (Install anyway)"**.

---

### Q3: Bagaimana jika santriwati sedang berhalangan / haid?
**Jawab**: Pada Tahap A (Sholat), pilih opsi **"Berhalangan"**. Sistem mencatat jurnal tetap terisi tanpa mengurangi nilai kepatuhan karena faktor uzur syar'i.

---

### Q4: Apakah data yang sudah terisi bisa diperbaiki jika salah pilih?
**Jawab**: Bisa. Buka kembali form pada hari tersebut, ubah pilihan yang keliru, lalu simpan ulang. Sistem otomatis memperbarui data yang ada.

---

### Q5: Bagaimana jika lupa kata sandi (*Password*)?
**Jawab**: Kata sandi awal seluruh akun adalah **`password123`**. Jika santri atau wali murid mengalami kendala masuk, silakan menghubungi **Guru Wali Kelas** masing-masing.

---

<br>

**SI-SANTRI — SMP NEGERI 2 PANJI**  
*Membangun Karakter Santri Disiplin, Jujur, dan Berakhlakul Karimah.*
