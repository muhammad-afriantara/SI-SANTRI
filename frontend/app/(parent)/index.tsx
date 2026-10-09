import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, radii, spacing, typography, touchTargets } from "../../utils/theme";
import { Card, ProgressBar, Badge, PrimaryButton } from "../../components/ui";
import { PRAYER_TIMES, prayerLabel, sleepLabel, wakeLabel, akhlakLabel } from "../../constants/formOptions";

export default function ParentHome() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [summary7, setSummary7] = useState<any>(null);
  const [summary30, setSummary30] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, s7, s30] = await Promise.all([
        apiRequest("/parent/dashboard", { token }),
        apiRequest("/parent/summary?days=7", { token }),
        apiRequest("/parent/summary?days=30", { token }),
      ]);
      setDashboard(d);
      setSummary7(s7);
      setSummary30(s30);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  const report = dashboard?.today_report;
  const scores = report?.scores;
  const pendingCount = dashboard?.pending_confirmations_count || 0;
  const latestNote = dashboard?.latest_note;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Info Anak */}
      <Card style={styles.childCard}>
        <View testID="parent-child-header">
          <Text style={styles.childName}>{dashboard?.student?.name}</Text>
          <Text style={styles.childMeta}>Kelas {dashboard?.student?.class_id} · NIPD {dashboard?.student?.nipd}</Text>
          <Text style={styles.childMeta}>Guru Wali: {dashboard?.student?.teacher_name}</Text>
        </View>
      </Card>

      {/* Banner Perlu Konfirmasi */}
      {pendingCount > 0 && (
        <Card style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <Text style={{ fontSize: 22 }}>⚠️</Text>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.alertTitle}>Perlu Konfirmasi Anda</Text>
              <Text style={styles.alertDesc}>
                Ada {pendingCount} laporan kegiatan rumah yang menunggu verifikasi orang tua.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.alertButton}
            onPress={() => router.push("/(parent)/confirmations" as any)}
          >
            <Text style={styles.alertButtonText}>Buka & Konfirmasi Sekarang →</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Status Pengisian Hari Ini */}
      <Card style={[styles.statusCard, dashboard?.today_filled ? styles.statusDone : styles.statusPending]}>
        <View testID="parent-today-status">
          <View style={styles.statusHeaderRow}>
            <Text style={styles.statusTitle}>
              {dashboard?.today_filled ? "Sudah mengisi kegiatan hari ini" : "Belum mengisi kegiatan hari ini"}
            </Text>
            {scores && (
              <Badge label={`Skor: ${scores.total} Poin`} tone="success" />
            )}
          </View>
          {report && (
            <Text style={styles.statusSubtitle}>
              Terisi pukul {new Date(report.submitted_at || report.updated_at).toLocaleTimeString("id-ID")}
              {report.submitted_late ? " (terlambat)" : ""}
            </Text>
          )}

          {/* Breakdown Skor Kategori Hari Ini */}
          {scores && (
            <View style={styles.scoreGrid}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreVal}>{scores.ibadah}/20</Text>
                <Text style={styles.scoreLbl}>Ibadah</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreVal}>{scores.belajar}/39</Text>
                <Text style={styles.scoreLbl}>Belajar</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreVal}>{scores.akhlak}/15</Text>
                <Text style={styles.scoreLbl}>Akhlak</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreVal}>{scores.pengembangan}/13</Text>
                <Text style={styles.scoreLbl}>Pengemb.</Text>
              </View>
            </View>
          )}
        </View>
      </Card>

      {/* Kartu Motivasi Terakhir */}
      {latestNote ? (
        <Card style={styles.motivationCard}>
          <View style={styles.motivationHeader}>
            <Text style={styles.motivationTitle}>💌 Pesan Motivasi Anda Terakhir</Text>
            <TouchableOpacity onPress={() => router.push("/(parent)/notes" as any)}>
              <Text style={styles.motivationLink}>+ Tulis Baru</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.motivationBody}>"{latestNote.message}"</Text>
        </Card>
      ) : (
        <Card style={styles.motivationCard}>
          <View style={styles.motivationHeader}>
            <Text style={styles.motivationTitle}>💌 Kirimkan Semangat untuk Ananda</Text>
          </View>
          <Text style={styles.motivationPrompt}>
            Beri ananda suntikan semangat dan doa terbaik Anda hari ini.
          </Text>
          <TouchableOpacity
            style={styles.motivationBtn}
            onPress={() => router.push("/(parent)/notes" as any)}
          >
            <Text style={styles.motivationBtnText}>Tulis Catatan Motivasi ❤️</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Rincian Sholat & Tidur Hari Ini */}
      {report && (
        <Card style={{ marginBottom: spacing.base }}>
          <Text style={styles.sectionTitle}>Sholat Fardhu & Istirahat Hari Ini</Text>
          {PRAYER_TIMES.map((p) => (
            <View key={p.key} style={styles.reportRow}>
              <Text style={styles.reportLabel}>{p.label}</Text>
              <Text style={styles.reportValue}>{prayerLabel(report[p.key])}</Text>
            </View>
          ))}
          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>Tidur / Bangun</Text>
            <Text style={styles.reportValue}>{sleepLabel(report.sleep_window)} / {wakeLabel(report.wake_window)}</Text>
          </View>
        </Card>
      )}

      {/* Ringkasan Kebiasaan 7 & 30 Hari */}
      <Text style={styles.sectionTitle}>Rata-Rata Karakter Ananda</Text>
      <View style={styles.summaryRow}>
        <SummaryCard testID="parent-summary-7days" title="7 Hari Terakhir" summary={summary7} />
        <SummaryCard testID="parent-summary-30days" title="30 Hari Terakhir" summary={summary30} />
      </View>
    </ScrollView>
  );
}

function SummaryCard({ testID, title, summary }: { testID: string; title: string; summary: any }) {
  const avgScore = summary?.average_score ?? "-";
  return (
    <Card style={styles.summaryCard}>
      <View testID={testID}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={styles.summaryScoreVal}>
          ⭐ {avgScore} <Text style={styles.summaryScoreSub}>/ 87 Poin</Text>
        </Text>
        <Text style={styles.summaryValue}>{summary?.submission_rate}% Terisi</Text>
        <ProgressBar progress={(summary?.submission_rate || 0) / 100} />
        <Text style={styles.summarySub}>{summary?.prayer_berjamaah_rate}% Jamaah</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  childCard: { marginBottom: spacing.base },
  childName: { ...typography.h2, color: colors.brand },
  childMeta: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  alertCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1.5,
    marginBottom: spacing.base,
    padding: spacing.md,
  },
  alertHeader: { flexDirection: "row", alignItems: "center" },
  alertTitle: { ...typography.h4, color: "#92400E" },
  alertDesc: { ...typography.caption, color: "#B45309", marginTop: 2 },
  alertButton: {
    backgroundColor: "#F59E0B",
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.button,
    alignItems: "center",
  },
  alertButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  statusCard: { marginBottom: spacing.base },
  statusDone: { backgroundColor: colors.brandTertiary },
  statusPending: { backgroundColor: colors.prayerGoldLight },
  statusHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusTitle: { ...typography.h4, color: colors.onSurface, flex: 1 },
  statusSubtitle: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: spacing.xs },
  scoreGrid: {
    flexDirection: "row",
    marginTop: spacing.md,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  scoreItem: { flex: 1, alignItems: "center" },
  scoreVal: { ...typography.bodyMedium, color: colors.brandPrimary, fontWeight: "700" },
  scoreLbl: { ...typography.caption, color: colors.onSurfaceSecondary, fontSize: 11, marginTop: 2 },
  motivationCard: {
    backgroundColor: "#FDF2F8",
    borderColor: "#FBCFE8",
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  motivationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  motivationTitle: { ...typography.caption, color: "#9D174D", fontWeight: "700" },
  motivationLink: { ...typography.caption, color: colors.brandPrimary, fontWeight: "700" },
  motivationBody: { ...typography.body, color: colors.onSurface, fontStyle: "italic", lineHeight: 20 },
  motivationPrompt: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  motivationBtn: {
    marginTop: spacing.sm,
    backgroundColor: "#EC4899",
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    alignItems: "center",
  },
  motivationBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  sectionTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.sm },
  reportRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  reportLabel: { ...typography.body, color: colors.onSurfaceSecondary },
  reportValue: { ...typography.bodyMedium, color: colors.onSurface },
  summaryRow: { flexDirection: "row", gap: spacing.sm },
  summaryCard: { flex: 1 },
  summaryTitle: { ...typography.caption, color: colors.onSurfaceTertiary },
  summaryScoreVal: { ...typography.h4, color: colors.brandPrimary, marginTop: 2 },
  summaryScoreSub: { ...typography.caption, color: colors.onSurfaceSecondary, fontSize: 11 },
  summaryValue: { ...typography.caption, color: colors.onSurface, marginTop: 4, marginBottom: spacing.xs },
  summarySub: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: spacing.xs },
});
