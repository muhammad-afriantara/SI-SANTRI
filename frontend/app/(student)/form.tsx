import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
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
  SLEEP_OPTIONS,
  WAKE_OPTIONS,
  NUTRITION_OPTIONS,
  PARENT_ACTIVITY_OPTIONS,
  PARENT_ACTIVITY_OTHER,
  STUDY_ACTIVITY_OPTIONS,
  STUDY_ACTIVITY_OTHER,
} from "../../constants/formOptions";

const TOTAL_STEPS = 5;
const STEP_TITLES = [
  "A. Sholat Fardhu 5 Waktu",
  "B. Waktu Tidur & Bangun",
  "C. Makan Bergizi",
  "D. Kegiatan Bersama Orang Tua",
  "E. Aktivitas Belajar",
];

type FormState = {
  subuh: string; dzuhur: string; ashar: string; maghrib: string; isya: string;
  sleep_window: string; wake_window: string;
  nutrition_items: string[];
  parent_activities: string[];
  parent_activity_custom: string;
  study_activities: string[];
  study_activity_custom: string;
};

const EMPTY_FORM: FormState = {
  subuh: "", dzuhur: "", ashar: "", maghrib: "", isya: "",
  sleep_window: "", wake_window: "",
  nutrition_items: [],
  parent_activities: [],
  parent_activity_custom: "",
  study_activities: [],
  study_activity_custom: "",
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
          subuh: existing.subuh, dzuhur: existing.dzuhur, ashar: existing.ashar,
          maghrib: existing.maghrib, isya: existing.isya,
          sleep_window: existing.sleep_window, wake_window: existing.wake_window,
          nutrition_items: existing.nutrition_items || [],
          parent_activities: existing.parent_activities || [],
          parent_activity_custom: existing.parent_activity_custom || "",
          study_activities: existing.study_activities || [],
          study_activity_custom: existing.study_activity_custom || "",
        });
        setIsEdit(true);
      } else {
        setForm(EMPTY_FORM);
        setIsEdit(false);
      }
    } catch (e) {
      show("Gagal memuat data form.", "error");
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

  const requestExit = () => {
    if (dirty) setShowExitConfirm(true);
    else router.replace("/(student)");
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!form.subuh || !form.dzuhur || !form.ashar || !form.maghrib || !form.isya) {
        return "Mohon isi kegiatan sholat untuk kelima waktu.";
      }
    } else if (step === 2) {
      if (!form.sleep_window || !form.wake_window) return "Mohon pilih jam tidur dan bangun.";
    } else if (step === 3) {
      if (form.nutrition_items.length === 0) return "Pilih minimal 1 kandungan menu makanan.";
    } else if (step === 4) {
      if (form.parent_activities.length === 0) return "Pilih minimal 1 kegiatan bersama orang tua.";
      if (form.parent_activities.includes(PARENT_ACTIVITY_OTHER) && !form.parent_activity_custom.trim()) {
        return "Isi keterangan kegiatan 'Lainnya'.";
      }
    } else if (step === 5) {
      if (form.study_activities.length === 0) return "Pilih minimal 1 aktivitas belajar.";
      if (form.study_activities.includes(STUDY_ACTIVITY_OTHER) && !form.study_activity_custom.trim()) {
        return "Isi keterangan kegiatan belajar lainnya.";
      }
    }
    return null;
  };

  const goNext = () => {
    const errorMsg = validateStep();
    if (errorMsg) {
      show(errorMsg, "error");
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleSubmit();
  };

  const goPrev = () => {
    if (step > 1) setStep(step - 1);
    else requestExit();
  };

  const handleSubmit = async () => {
    const errorMsg = validateStep();
    if (errorMsg) {
      show(errorMsg, "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("/student/reports", {
        method: "POST",
        token,
        body: { activity_date: activityDate, ...form },
      });
      show("Kegiatan berhasil disimpan!", "success");
      setDirty(false);
      router.replace("/(student)");
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Gagal menyimpan data.";
      show(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]} testID="wizard-loading">
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity testID="wizard-close-button" onPress={requestExit} style={styles.closeButton}>
          <Text style={styles.closeText}>Tutup</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? "Ubah Laporan" : "Isi Kegiatan"} · {activityDate}</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.progressWrap} testID="wizard-step-indicator">
        <Text style={styles.stepLabel}>Langkah {step} dari {TOTAL_STEPS}</Text>
        <ProgressBar progress={step / TOTAL_STEPS} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>{STEP_TITLES[step - 1]}</Text>

        {step === 1 && (
          <View>
            {PRAYER_TIMES.map((prayer) => (
              <View key={prayer.key} style={styles.prayerRow}>
                <Text style={styles.prayerLabel}>{prayer.label}</Text>
                <View style={styles.chipWrapRow}>
                  {PRAYER_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.value}
                      label={opt.label}
                      selected={(form as any)[prayer.key] === opt.value}
                      onPress={() => updateForm({ [prayer.key]: opt.value } as Partial<FormState>)}
                      testID={`wizard-sholat-chip-${prayer.key}-${opt.value}`}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.subLabel}>Jam berapa kamu tidur malam?</Text>
            <View style={styles.chipWrapRow}>
              {SLEEP_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={form.sleep_window === opt.value}
                  onPress={() => updateForm({ sleep_window: opt.value })}
                  testID={`wizard-sleep-chip-${opt.value}`}
                />
              ))}
            </View>
            <Text style={[styles.subLabel, { marginTop: spacing.lg }]}>Jam berapa kamu bangun pagi?</Text>
            <View style={styles.chipWrapRow}>
              {WAKE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={form.wake_window === opt.value}
                  onPress={() => updateForm({ wake_window: opt.value })}
                  testID={`wizard-wake-chip-${opt.value}`}
                />
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.subLabel}>Mengandung apa sajakah menu makananmu hari ini? (Pilih minimal 1)</Text>
            <View style={styles.chipWrapRow}>
              {NUTRITION_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={form.nutrition_items.includes(opt.value)}
                  onPress={() => updateForm({ nutrition_items: toggleInList(form.nutrition_items, opt.value) })}
                  testID={`wizard-nutrisi-chip-${opt.value}`}
                />
              ))}
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.subLabel}>Pilih kegiatan bersama orang tua hari ini (boleh lebih dari 1)</Text>
            <View style={styles.chipColumn}>
              {PARENT_ACTIVITY_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={form.parent_activities.includes(opt)}
                  onPress={() => updateForm({ parent_activities: toggleInList(form.parent_activities, opt) })}
                  testID={`wizard-ortu-chip-${opt}`}
                />
              ))}
            </View>
            {form.parent_activities.includes(PARENT_ACTIVITY_OTHER) && (
              <TextInput
                testID="wizard-ortu-other-input"
                style={styles.textarea}
                placeholder="Tuliskan kegiatan lainnya..."
                placeholderTextColor={colors.onSurfaceTertiary}
                value={form.parent_activity_custom}
                onChangeText={(v) => updateForm({ parent_activity_custom: v })}
                multiline
              />
            )}
          </View>
        )}

        {step === 5 && (
          <View>
            <Text style={styles.subLabel}>Pilih aktivitas belajar hari ini (boleh lebih dari 1)</Text>
            <View style={styles.chipColumn}>
              {STUDY_ACTIVITY_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={form.study_activities.includes(opt)}
                  onPress={() => updateForm({ study_activities: toggleInList(form.study_activities, opt) })}
                  testID={`wizard-belajar-chip-${opt}`}
                />
              ))}
            </View>
            {form.study_activities.includes(STUDY_ACTIVITY_OTHER) && (
              <TextInput
                testID="wizard-belajar-other-input"
                style={styles.textarea}
                placeholder="Tuliskan kegiatan non akademik lainnya..."
                placeholderTextColor={colors.onSurfaceTertiary}
                value={form.study_activity_custom}
                onChangeText={(v) => updateForm({ study_activity_custom: v })}
                multiline
              />
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.base }]}>
        <PrimaryButton title="Kembali" onPress={goPrev} variant="secondary" testID="wizard-prev-button" style={styles.footerBtn} />
        <PrimaryButton
          title={step === TOTAL_STEPS ? "Simpan Kegiatan" : "Lanjut"}
          onPress={goNext}
          loading={submitting}
          testID={step === TOTAL_STEPS ? "wizard-submit-button" : "wizard-next-button"}
          style={styles.footerBtn}
        />
      </View>

      <ConfirmSheet
        visible={showExitConfirm}
        title="Keluar tanpa menyimpan?"
        message="Perubahan yang belum disimpan akan hilang jika kamu keluar sekarang."
        confirmLabel="Ya, Keluar"
        cancelLabel="Lanjutkan Mengisi"
        onConfirm={() => {
          setShowExitConfirm(false);
          router.replace("/(student)");
        }}
        onCancel={() => setShowExitConfirm(false)}
        testID="wizard-exit-confirm-sheet"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.base, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surfaceElevated,
  },
  closeButton: { width: 48, paddingVertical: spacing.xs },
  closeText: { ...typography.bodyMedium, color: colors.error },
  headerTitle: { ...typography.h4, color: colors.onSurface },
  progressWrap: { paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surfaceElevated },
  stepLabel: { ...typography.caption, color: colors.onSurfaceSecondary, marginBottom: spacing.xs },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  stepTitle: { ...typography.h2, color: colors.brand, marginBottom: spacing.base },
  prayerRow: { marginBottom: spacing.lg },
  prayerLabel: { ...typography.bodyMedium, color: colors.onSurface, marginBottom: spacing.sm },
  subLabel: { ...typography.bodyMedium, color: colors.onSurface, marginBottom: spacing.sm },
  chipWrapRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chipColumn: { gap: spacing.sm },
  textarea: {
    marginTop: spacing.md, minHeight: 80, borderRadius: radii.button, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surfaceElevated, padding: spacing.base,
    color: colors.onSurface, textAlignVertical: "top", ...typography.body,
  },
  footer: {
    flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.base, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceElevated,
  },
  footerBtn: { flex: 1 },
});
