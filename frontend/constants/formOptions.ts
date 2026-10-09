export type PrayerValue = "jamaah" | "munfarid" | "berhalangan" | "tidak_sholat";

export const PRAYER_TIMES: { key: string; label: string }[] = [
  { key: "subuh", label: "Subuh" },
  { key: "dzuhur", label: "Dzuhur" },
  { key: "ashar", label: "Ashar" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isya", label: "Isya" },
];

export const PRAYER_OPTIONS: { value: PrayerValue; label: string; score: number }[] = [
  { value: "jamaah", label: "Berjamaah (+4)", score: 4 },
  { value: "munfarid", label: "Munfarid (+3)", score: 3 },
  { value: "berhalangan", label: "Berhalangan / Haid (0)", score: 0 },
  { value: "tidak_sholat", label: "Tidak Sholat (-3)", score: -3 },
];

// Indikator Kategori Belajar (Checklist)
export const BELAJAR_INDICATORS: {
  group: string;
  items: { key: string; label: string; score: number }[];
}[] = [
  {
    group: "Mengerjakan Tugas (Maks 9 Poin)",
    items: [
      { key: "tugas_selesai", label: "Menyelesaikan tugas dari guru", score: 3 },
      { key: "tugas_mandiri", label: "Mengerjakan tugas secara mandiri", score: 3 },
      { key: "tugas_tepat_waktu", label: "Mengumpulkan tugas tepat waktu", score: 3 },
    ],
  },
  {
    group: "Membaca Materi (Maks 8 Poin)",
    items: [
      { key: "baca_hari_ini", label: "Membaca materi pelajaran hari ini", score: 3 },
      { key: "baca_persiapan", label: "Membaca materi untuk persiapan berikutnya", score: 5 },
    ],
  },
  {
    group: "Menyimak Materi (Maks 6 Poin)",
    items: [
      { key: "menyimak_penjelasan", label: "Menyimak video / penjelasan guru", score: 3 },
      { key: "menyimak_selesai", label: "Menyimak materi sampai tuntas", score: 3 },
    ],
  },
  {
    group: "Menulis atau Mencatat (Maks 8 Poin)",
    items: [
      { key: "catat_poin", label: "Mencatat poin penting materi", score: 3 },
      { key: "catat_rangkuman", label: "Membuat rangkuman dengan bahasa sendiri", score: 5 },
    ],
  },
  {
    group: "Ekstrakurikuler Belajar (Maks 8 Poin)",
    items: [
      { key: "ekskul_jadwal", label: "Mengikuti ekskul akademik sesuai jadwal", score: 3 },
      { key: "ekskul_mandiri", label: "Berlatih mandiri sesuai bidang ekskul", score: 5 },
    ],
  },
];

// Indikator Kategori Akhlak (Bakti di Rumah & Pendampingan Orang Tua, Maks 15 Poin)
export const AKHLAK_INDICATORS: { key: string; label: string; score: number }[] = [
  { key: "rapikan_barang", label: "Merapikan barang pribadi (kamar, alat sekolah)", score: 3 },
  { key: "bersih_rumah", label: "Membersihkan rumah (menyapu, mengepel, mencuci)", score: 3 },
  { key: "masak_hidangan", label: "Belanja bahan masak, memasak, menyiapkan hidangan", score: 3 },
  { key: "bantu_ortu", label: "Membantu orang tua ketika lelah / menemani saat bekerja", score: 3 },
  { key: "rawat_hewan_tanaman", label: "Merawat tanaman atau hewan peliharaan keluarga", score: 3 },
];

// Indikator Kategori Pengembangan Diri (Ekskul, Tidur, Bangun, Maks 13 Poin)
export const PENGEMBANGAN_EKSKUL_ITEMS: { key: string; label: string; score: number }[] = [
  { key: "latihan_jadwal", label: "Latihan ekskul sesuai jadwal sekolah", score: 3 },
  { key: "kegiatan_tambahan", label: "Kegiatan tambahan di luar jadwal ekskul", score: 4 },
];

export const SLEEP_OPTIONS = [
  { value: "19_20", label: "19.00 – 20.00 (+3)", score: 3 },
  { value: "20_21", label: "20.00 – 21.00 (+2)", score: 2 },
  { value: "21_22", label: "21.00 – 22.00 (+1)", score: 1 },
  { value: "22_midnight", label: "22.00 – tengah malam (-3)", score: -3 },
];

export const WAKE_OPTIONS = [
  { value: "03_04", label: "03.00 – 04.00 (+3)", score: 3 },
  { value: "04_05", label: "04.00 – 05.00 (+2)", score: 2 },
  { value: "05_06", label: "05.00 – 06.00 (+1)", score: 1 },
  { value: "06_noon", label: "06.00 – siang (-3)", score: -3 },
];

// Compatibility helpers
export function prayerLabel(value?: string) {
  return PRAYER_OPTIONS.find((o) => o.value === value)?.label || "-";
}
export function sleepLabel(value?: string) {
  return SLEEP_OPTIONS.find((o) => o.value === value)?.label || "-";
}
export function wakeLabel(value?: string) {
  return WAKE_OPTIONS.find((o) => o.value === value)?.label || "-";
}
export function akhlakLabel(key: string): string {
  const hit = AKHLAK_INDICATORS.find((i) => i.key === key);
  return hit ? hit.label : key.replace(/_/g, " ");
}

