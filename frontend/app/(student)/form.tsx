import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest, ApiError } from "../../utils/api";
import { useToast } from "../../components/Toast";
import { ConfirmSheet } from "../../components/ConfirmSheet";
import { Chip, PrimaryButton, ProgressBar } from "../../components/ui";
import { colors, radii, spacing, typography } from "../../utils/theme";
import {
  PRAYER_TIMES,
  PRAYER_OPTIONS,
  BELAJAR_INDICATORS,
  AKHLAK_INDICATORS,
  PENGEMBANGAN_EKSKUL_ITEMS,
  SLEEP_OPTIONS,
  WAKE_OPTIONS,
} from "../../constants/formOptions";

const TOTAL_STEPS = 4;
const STEP_TITLES = [
  "1. Ibadah (Sholat 5 Waktu)",
  "2. Belajar (Aktivitas Mandiri)",
  "3. Akhlak (Bakti di Rumah)",
  "4. Pengembangan Diri",
];

type FormState = {
  subuh: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
  belajar_items: string[];
  akhlak_items: string[];
  pengembangan_ekskul: string[];
  sleep_window: string;
  wake_window: string;
  proofs: { id: string; url: string; caption?: string }[];
  notes: string;
};

const EMPTY_FORM: FormState = {
  subuh: "",
  dzuhur: "",
  ashar: "",
  maghrib: "",
  isya: "",
  belajar_items: [],
  akhlak_items: [],
  pengembangan_ekskul: [],
  sleep_window: "",
  wake_window: "",
  proofs: [],
  notes: "",
};

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function ActivityFormScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { show } = useToast();
  const params = useLocalSearchParams<{ date?: string }>();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activityDate, setActivityDate] = useState<string>("");
  const [isEdit, setIsEdit] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setStep(1);
    setDirty(false);
    try {
      let targetDate = params.date;
      if (!targetDate) {
        const dashboard = await apiRequest("/student/dashboard", { token });
        targetDate = dashboard.today_date;
      }
      setActivityDate(targetDate!);
      const existing = await apiRequest(`/student/reports/${targetDate}`, { token });
      if (existing) {
        setForm({
          subuh: existing.subuh || "",
          dzuhur: existing.dzuhur || "",
          ashar: existing.ashar || "",
          maghrib: existing.maghrib || "",
          isya: existing.isya || "",
          belajar_items: existing.belajar_items || [],
          akhlak_items: existing.akhlak_items || [],
          pengembangan_ekskul: existing.pengembangan_ekskul || [],
          sleep_window: existing.sleep_window || "",
          wake_window: existing.wake_window || "",
          proofs: existing.proofs || [],
          notes: existing.notes || "",
        });
        setIsEdit(true);
      } else {
        setForm(EMPTY_FORM);
        setIsEdit(false);
      }
    } catch (e) {
      show("Gagal memuat data formulir.", "error");
    } finally {
      setLoading(false);
    }
  }, [params.date, token, show]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const updateForm = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  // Kalkulasi Skor Realtime di Klien
  const currentScores = useMemo(() => {
    let ibadah = 0;
    const prayers = [form.subuh, form.dzuhur, form.ashar, form.maghrib, form.isya];
    for (const p of prayers) {
      if (p === "jamaah") ibadah += 4;
      else if (p === "munfarid") ibadah += 3;
      else if (p === "tidak_sholat") ibadah -= 3;
    }

    let belajar = 0;
    const allBelajar = BELAJAR_INDICATORS.flatMap((g) => g.items);
    for (const key of form.belajar_items) {
      const match = allBelajar.find((item) => item.key === key);
      if (match) belajar += match.score;
    }
    belajar = Math.min(belajar, 39);

    let akhlak = 0;
    for (const key of form.akhlak_items) {
      const match = AKHLAK_INDICATORS.find((item) => item.key === key);
      if (match) akhlak += match.score;
    }
    akhlak = Math.min(akhlak, 15);

    let pengembangan = 0;
    for (const key of form.pengembangan_ekskul) {
      const match = PENGEMBANGAN_EKSKUL_ITEMS.find((item) => item.key === key);
      if (match) pengembangan += match.score;
    }
    const sleepMatch = SLEEP_OPTIONS.find((s) => s.value === form.sleep_window);
    if (sleepMatch) pengembangan += sleepMatch.score;
    const wakeMatch = WAKE_OPTIONS.find((w) => w.value === form.wake_window);
    if (wakeMatch) pengembangan += wakeMatch.score;

    const total = ibadah + belajar + akhlak + pengembangan;
    return { ibadah, belajar, akhlak, pengembangan, total };
  }, [form]);

  // Validasi Langkah
  const canProceed = (): { ok: boolean; message?: string } => {
    if (step === 1) {
      if (!form.subuh || !form.dzuhur || !form.ashar || !form.maghrib || !form.isya) {
        return { ok: false, message: "Pilih status untuk seluruh 5 waktu sholat fardhu." };
      }
    } else if (step === 2) {
      if (form.belajar_items.length === 0) {
        return { ok: false, message: "Pilih minimal 1 aktivitas belajar yang dilakukan hari ini." };
      }
    } else if (step === 3) {
      if (form.akhlak_items.length === 0) {
        return { ok: false, message: "Pilih minimal 1 kegiatan bakti bersama orang tua." };
      }
    } else if (step === 4) {
      if (!form.sleep_window || !form.wake_window) {
        return { ok: false, message: "Pilih jam tidur malam dan bangun pagi Anda." };
      }
    }
    return { ok: true };
  };

  const handleNext = () => {
    const val = canProceed();
    if (!val.ok) {
      show(val.message!, "error");
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const val = canProceed();
    if (!val.ok) {
      show(val.message!, "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        activity_date: activityDate,
        subuh: form.subuh,
        dzuhur: form.dzuhur,
        ashar: form.ashar,
        maghrib: form.maghrib,
        isya: form.isya,
        belajar_items: form.belajar_items,
        akhlak_items: form.akhlak_items,
        pengembangan_ekskul: form.pengembangan_ekskul,
        sleep_window: form.sleep_window,
        wake_window: form.wake_window,
        proofs: form.proofs,
        notes: form.notes,
      };

      const res = await apiRequest("/student/reports", {
        method: "POST",
        token,
        body: payload,
      });

      const totalScored = res?.scores?.total ?? currentScores.total;
      show(`Alhamdulillah! Jurnal tersimpan dengan total skor ${totalScored} poin.`, "success");
      setDirty(false);
      router.replace("/(student)");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Gagal menyimpan jurnal.";
      show(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickImage = async (fromCamera: boolean = false) => {
    if ((form.proofs || []).length >= 2) {
      show("Maksimal 2 foto bukti per hari untuk menjaga kuota server.", "error");
      return;
    }
    try {
      let result;
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          show("Izin kamera diperlukan untuk mengambil foto.", "error");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.3,
          aspect: [4, 3],
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.3,
          aspect: [4, 3],
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]?.base64) {
        const asset = result.assets[0];
        const dataUri = `data:image/jpeg;base64,${asset.base64}`;
        const newProof = {
          id: `PRF_${Date.now()}`,
          url: dataUri,
          caption: "Foto kegiatan siswa",
        };
        updateForm({ proofs: [...(form.proofs || []).slice(0, 1), newProof] });
      }
    } catch (e) {
      show("Gagal mengambil/memilih foto.", "error");
    }
  };

  const handleRemoveProof = (id: string) => {
    updateForm({ proofs: (form.proofs || []).filter((p) => p.id !== id) });
  };

  const handleBackPress = () => {
    if (dirty) setShowExitConfirm(true);
    else router.back();
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity testID="form-back-button" onPress={handleBackPress}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} testID="form-title">
          {isEdit ? "Ubah Jurnal Santri" : "Isi Jurnal Karakter"}
        </Text>
        <Text style={styles.headerSubtitle}>
          Tanggal: {activityDate} · Langkah {step} dari {TOTAL_STEPS}
        </Text>
        <ProgressBar progress={step / TOTAL_STEPS} style={{ marginTop: spacing.sm }} />
      </View>

      {/* Banner Estimasi Skor Real-time */}
      <View style={styles.scoreBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.scoreBannerTitle}>⭐ Estimasi Skor Karakter</Text>
          <Text style={styles.scoreBannerSubtitle}>
            Ibadah: {currentScores.ibadah} · Belajar: {currentScores.belajar} · Akhlak: {currentScores.akhlak} · Diri: {currentScores.pengembangan}
          </Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scorePillText}>{currentScores.total} / 87 Poin</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle} testID="form-step-title">{STEP_TITLES[step - 1]}</Text>

        {/* LANGKAH 1: IBADAH */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHelp}>
              Pilih pelaksanaan sholat fardhu 5 waktu hari ini. Berjamaah bernilai +4 poin, Munfarid +3 poin, dan Berhalangan 0 poin.
            </Text>
            {PRAYER_TIMES.map((p) => {
              const currentVal = (form as any)[p.key];
              return (
                <View key={p.key} style={styles.cardSection}>
                  <Text style={styles.prayerLabel}>🕌 Sholat {p.label}</Text>
                  <View style={styles.chipRow}>
                    {PRAYER_OPTIONS.map((opt) => (
                      <Chip
                        key={opt.value}
                        label={opt.label}
                        selected={currentVal === opt.value}
                        onPress={() => updateForm({ [p.key]: opt.value } as any)}
                        tone={opt.score < 0 ? "danger" : opt.score === 4 ? "success" : "default"}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* LANGKAH 2: BELAJAR */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHelp}>
              Centang aktivitas belajar mandiri dan akademik yang kamu lakukan hari ini (Maksimal 39 Poin).
            </Text>
            {BELAJAR_INDICATORS.map((group, gIdx) => (
              <View key={gIdx} style={styles.cardSection}>
                <Text style={styles.groupHeader}>{group.group}</Text>
                {group.items.map((item) => {
                  const checked = form.belajar_items.includes(item.key);
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.checkboxItem, checked && styles.checkboxItemActive]}
                      onPress={() => updateForm({ belajar_items: toggleInList(form.belajar_items, item.key) })}
                    >
                      <Text style={styles.checkIcon}>{checked ? "☑️" : "⬜"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.checkText, checked && styles.checkTextActive]}>{item.label}</Text>
                      </View>
                      <Text style={styles.scoreBadge}>+{item.score}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* LANGKAH 3: AKHLAK & BAKTI ORTU */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHelp}>
              Centang aktivitas bakti dan bantuan yang kamu berikan kepada orang tua di rumah hari ini (+3 poin per aktivitas, Maks 15 Poin).
            </Text>
            <View style={styles.cardSection}>
              {AKHLAK_INDICATORS.map((item) => {
                const checked = form.akhlak_items.includes(item.key);
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.checkboxItem, checked && styles.checkboxItemActive]}
                    onPress={() => updateForm({ akhlak_items: toggleInList(form.akhlak_items, item.key) })}
                  >
                    <Text style={styles.checkIcon}>{checked ? "☑️" : "⬜"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.checkText, checked && styles.checkTextActive]}>{item.label}</Text>
                    </View>
                    <Text style={styles.scoreBadge}>+{item.score}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* LANGKAH 4: PENGEMBANGAN DIRI */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHelp}>
              Aktivitas ekstrakurikuler serta disiplin waktu tidur malam dan bangun pagi.
            </Text>

            {/* Ekskul */}
            <View style={styles.cardSection}>
              <Text style={styles.groupHeader}>Latihan Ekstrakurikuler (Maks 7 Poin)</Text>
              {PENGEMBANGAN_EKSKUL_ITEMS.map((item) => {
                const checked = form.pengembangan_ekskul.includes(item.key);
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.checkboxItem, checked && styles.checkboxItemActive]}
                    onPress={() => updateForm({ pengembangan_ekskul: toggleInList(form.pengembangan_ekskul, item.key) })}
                  >
                    <Text style={styles.checkIcon}>{checked ? "☑️" : "⬜"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.checkText, checked && styles.checkTextActive]}>{item.label}</Text>
                    </View>
                    <Text style={styles.scoreBadge}>+{item.score}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Jam Tidur */}
            <View style={styles.cardSection}>
              <Text style={styles.groupHeader}>Waktu Tidur Malam</Text>
              <Text style={styles.groupSub}>Tidur lebih awal membantu kebugaran dan sholat subuh tepat waktu.</Text>
              <View style={styles.chipRow}>
                {SLEEP_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={form.sleep_window === opt.value}
                    onPress={() => updateForm({ sleep_window: opt.value })}
                    tone={opt.score < 0 ? "danger" : "default"}
                  />
                ))}
              </View>
            </View>

            {/* Jam Bangun */}
            <View style={styles.cardSection}>
              <Text style={styles.groupHeader}>Waktu Bangun Pagi</Text>
              <Text style={styles.groupSub}>Bangun sebelum subuh melatih kedisiplinan santri mandiri.</Text>
              <View style={styles.chipRow}>
                {WAKE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={form.wake_window === opt.value}
                    onPress={() => updateForm({ wake_window: opt.value })}
                    tone={opt.score < 0 ? "danger" : "default"}
                  />
                ))}
              </View>
            </View>

            {/* Foto Bukti Kegiatan */}
            <View style={styles.cardSection}>
              <View style={styles.photoHeaderRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.groupHeader}>
                    Foto Bukti Kegiatan ({form.proofs ? form.proofs.length : 0}/2)
                  </Text>
                  <Text style={styles.photoSubHint}>
                    Maks. 2 foto • Otomatis dibersihkan setelah 7 hari
                  </Text>
                </View>
                {(form.proofs || []).length < 2 ? (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity
                      style={styles.addPhotoSmallBtn}
                      onPress={() => handlePickImage(true)}
                    >
                      <Text style={styles.addPhotoSmallBtnText}>📷 Kamera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addPhotoSmallBtn, styles.addPhotoGalleryBtn]}
                      onPress={() => handlePickImage(false)}
                    >
                      <Text style={styles.addPhotoGalleryText}>🖼️ Galeri</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoLimitBadge}>
                    <Text style={styles.photoLimitBadgeText}>Penuh (2/2)</Text>
                  </View>
                )}
              </View>
              {form.proofs && form.proofs.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                  {form.proofs.map((p) => (
                    <View key={p.id} style={styles.proofItemWrap}>
                      <Image source={{ uri: p.url }} style={styles.proofPreview} />
                      <TouchableOpacity
                        style={styles.removeProofBadge}
                        onPress={() => handleRemoveProof(p.id)}
                      >
                        <Text style={styles.removeProofText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.photoHint}>
                  Kamu bisa melampirkan foto saat membantu orang tua, merapikan kamar, belajar, atau kegiatan positif lainnya.
                </Text>
              )}
            </View>

            {/* Catatan Tambahan */}
            <View style={styles.cardSection}>
              <Text style={styles.groupHeader}>Catatan Aktivitas Hari Ini (Opsional)</Text>
              <TextInput
                style={styles.textArea}
                value={form.notes}
                onChangeText={(val) => updateForm({ notes: val })}
                placeholder="Tuliskan pengalaman atau hal positif yang kamu pelajari hari ini..."
                placeholderTextColor={colors.onSurfaceTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        )}

        {/* Tombol Navigasi Wizard */}
        <View style={styles.navRow}>
          {step > 1 ? (
            <PrimaryButton
              title="‹ Sebelumnya"
              variant="secondary"
              onPress={handlePrev}
              style={{ flex: 1, marginRight: spacing.sm }}
            />
          ) : null}
          <PrimaryButton
            title={step === TOTAL_STEPS ? (isEdit ? "Simpan Perubahan" : "Kirim Jurnal") : "Lanjutkan ›"}
            onPress={handleNext}
            loading={submitting}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>

      {/* Konfirmasi Keluar jika Form Kotor */}
      <ConfirmSheet
        visible={showExitConfirm}
        title="Batalkan Pengisian?"
        message="Perubahan yang kamu pilih belum disimpan. Yakin ingin keluar?"
        confirmText="Keluar Tanpa Simpan"
        cancelText="Lanjut Mengisi"
        onConfirm={() => {
          setShowExitConfirm(false);
          router.back();
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: { ...typography.bodyMedium, color: colors.brandPrimary, marginBottom: 2 },
  headerTitle: { ...typography.h2, color: colors.onSurface },
  headerSubtitle: { ...typography.caption, color: colors.onSurfaceSecondary },
  scoreBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderBottomWidth: 1,
    borderBottomColor: "#A7F3D0",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scoreBannerTitle: { fontSize: 13, fontWeight: "800", color: "#065F46" },
  scoreBannerSubtitle: { fontSize: 11, color: "#047857", marginTop: 2 },
  scorePill: {
    backgroundColor: "#047857",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.button,
  },
  scorePillText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  stepTitle: { ...typography.h2, color: colors.brand, marginBottom: spacing.xs },
  stepHelp: { ...typography.body, color: colors.onSurfaceSecondary, marginBottom: spacing.md },
  stepContainer: { gap: spacing.md },
  cardSection: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prayerLabel: { ...typography.h4, color: colors.onSurface, marginBottom: spacing.xs },
  groupHeader: { ...typography.h4, color: colors.onSurface, marginBottom: spacing.xs },
  groupSub: { ...typography.caption, color: colors.onSurfaceTertiary, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSecondary,
  },
  checkboxItemActive: { backgroundColor: "#F0FDF4", borderRadius: 8 },
  checkIcon: { fontSize: 18, marginRight: spacing.sm },
  checkText: { ...typography.body, color: colors.onSurface },
  checkTextActive: { fontWeight: "700", color: "#065F46" },
  scoreBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#047857",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: spacing.sm,
  },
  textArea: {
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.onSurface,
    textAlignVertical: "top",
    minHeight: 70,
  },
  photoHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  photoSubHint: { fontSize: 11, color: colors.onSurfaceTertiary, marginTop: 2 },
  addPhotoBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: radii.button,
  },
  addPhotoBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  addPhotoSmallBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoSmallBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 11 },
  addPhotoGalleryBtn: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addPhotoGalleryText: { color: colors.onSurface, fontWeight: "600", fontSize: 11 },
  photoLimitBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 8,
  },
  photoLimitBadgeText: { fontSize: 11, color: colors.onSurfaceSecondary, fontWeight: "600" },
  proofItemWrap: { marginRight: spacing.sm, position: "relative" },
  proofPreview: { width: 80, height: 80, borderRadius: radii.sm, backgroundColor: colors.border },
  removeProofBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: colors.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  removeProofText: { color: "#FFFFFF", fontSize: 11, fontWeight: "bold" },
  photoHint: { ...typography.caption, color: colors.onSurfaceTertiary, marginTop: spacing.xs },
  navRow: { flexDirection: "row", marginTop: spacing.xl },
});
