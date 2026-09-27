export type PrayerValue = "jamaah" | "munfarid" | "berhalangan" | "tidak_sholat";

export const PRAYER_TIMES: { key: string; label: string }[] = [
  { key: "subuh", label: "Subuh" },
  { key: "dzuhur", label: "Dzuhur" },
  { key: "ashar", label: "Ashar" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isya", label: "Isya" },
];

export const PRAYER_OPTIONS: { value: PrayerValue; label: string }[] = [
  { value: "jamaah", label: "Berjamaah" },
  { value: "munfarid", label: "Munfarid" },
  { value: "berhalangan", label: "Berhalangan" },
  { value: "tidak_sholat", label: "Tidak Sholat" },
];

export const SLEEP_OPTIONS = [
  { value: "19_20", label: "19.00 – 20.00" },
  { value: "20_21", label: "20.00 – 21.00" },
  { value: "21_22", label: "21.00 – 22.00" },
  { value: "22_midnight", label: "22.00 – tengah malam" },
];

export const WAKE_OPTIONS = [
  { value: "03_04", label: "03.00 – 04.00" },
  { value: "04_05", label: "04.00 – 05.00" },
  { value: "05_06", label: "05.00 – 06.00" },
  { value: "06_noon", label: "06.00 – siang" },
];

export const NUTRITION_OPTIONS = [
  { value: "karbohidrat", label: "Karbohidrat" },
  { value: "vitamin", label: "Vitamin" },
  { value: "protein", label: "Protein" },
];

export const PARENT_ACTIVITY_OPTIONS = [
  "Membersihkan kamar/ruang tamu/dapur",
  "Membersihkan halaman dan ruangan lain",
  "Mencuci piring / mencuci baju / mencuci kendaraan dan lain-lain",
  "Memasak / belanja / menyiapkan makanan dan lain-lain",
  "Menjaga adik / keluarga dan lain-lain",
  "Berkebun / merawat hewan peliharaan dan lain-lain",
  "Membantu orang tua bekerja dan lain-lain",
  "Lainnya",
];
export const PARENT_ACTIVITY_OTHER = "Lainnya";

export const STUDY_ACTIVITY_OPTIONS = [
  "Mengerjakan tugas/PR",
  "Membaca materi pelajaran",
  "Menyimak materi pelajaran (video pembelajaran)",
  "Menulis/mencatat materi",
  "Ekstrakurikuler sekolah",
  "Kegiatan non akademik lainnya",
];
export const STUDY_ACTIVITY_OTHER = "Kegiatan non akademik lainnya";

export function prayerLabel(value?: string) {
  return PRAYER_OPTIONS.find((o) => o.value === value)?.label || "-";
}
export function sleepLabel(value?: string) {
  return SLEEP_OPTIONS.find((o) => o.value === value)?.label || "-";
}
export function wakeLabel(value?: string) {
  return WAKE_OPTIONS.find((o) => o.value === value)?.label || "-";
}
