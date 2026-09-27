import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, spacing, typography } from "../../utils/theme";
import { Card, Badge, ProgressBar } from "../../components/ui";
import { PRAYER_TIMES, prayerLabel, sleepLabel, wakeLabel } from "../../constants/formOptions";

export default function TeacherStudentDetail() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest(`/teacher/students/${id}`, { token });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]} testID="teacher-student-detail-loading">
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  const report = data?.report;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }}>
      <TouchableOpacity testID="teacher-student-detail-back-button" onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Kembali</Text>
      </TouchableOpacity>

      <Card style={styles.profileCard}>
        <Text style={styles.studentName} testID="teacher-student-detail-name">{data?.student?.name}</Text>
        <Text style={styles.studentMeta}>NIPD: {data?.student?.nipd} · Kelas {data?.student?.class_id}</Text>
        <Text style={styles.studentMeta}>Guru Wali: {data?.student?.teacher_name}</Text>
      </Card>

      <View style={styles.recapRow}>
        <RecapCard testID="teacher-student-recap-7" title="7 Hari" recap={data?.recap_7_days} />
        <RecapCard testID="teacher-student-recap-30" title="30 Hari" recap={data?.recap_30_days} />
      </View>

      <Text style={styles.sectionTitle}>Laporan Tanggal {data?.date}</Text>
      {report ? (
        <Card style={styles.reportCard} >
          <View testID="teacher-student-report-detail">
            <View style={styles.reportRow}>
              <Text style={styles.reportLabel}>Waktu Pengisian</Text>
              <Text style={styles.reportValue}>{new Date(report.submitted_at).toLocaleString("id-ID")}</Text>
            </View>
            {report.submitted_late && <Badge label="Terlambat mengisi" tone="warning" />}
            <Text style={styles.sectionSubtitle}>Sholat Fardhu</Text>
            {PRAYER_TIMES.map((p) => (
              <View key={p.key} style={styles.reportRow}>
                <Text style={styles.reportLabel}>{p.label}</Text>
                <Text style={styles.reportValue}>{prayerLabel(report[p.key])}</Text>
              </View>
            ))}
            <Text style={styles.sectionSubtitle}>Tidur & Bangun</Text>
            <View style={styles.reportRow}>
              <Text style={styles.reportLabel}>Tidur Malam</Text>
              <Text style={styles.reportValue}>{sleepLabel(report.sleep_window)}</Text>
            </View>
            <View style={styles.reportRow}>
              <Text style={styles.reportLabel}>Bangun Pagi</Text>
              <Text style={styles.reportValue}>{wakeLabel(report.wake_window)}</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Nutrisi</Text>
            <Text style={styles.reportValue}>{report.nutrition_items?.join(", ")}</Text>
            <Text style={styles.sectionSubtitle}>Kegiatan Bersama Orang Tua</Text>
            <Text style={styles.reportValue}>{report.parent_activities?.join(", ")}</Text>
            {report.parent_activity_custom && <Text style={styles.reportNote}>Keterangan: {report.parent_activity_custom}</Text>}
            <Text style={styles.sectionSubtitle}>Aktivitas Belajar</Text>
            <Text style={styles.reportValue}>{report.study_activities?.join(", ")}</Text>
            {report.study_activity_custom && <Text style={styles.reportNote}>Keterangan: {report.study_activity_custom}</Text>}
          </View>
        </Card>
      ) : (
        <Card testID="teacher-student-report-empty">
          <Text style={styles.emptyText}>Siswa ini belum mengisi laporan pada tanggal tersebut.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

function RecapCard({ testID, title, recap }: { testID: string; title: string; recap: any }) {
  return (
    <Card style={styles.recapCard} >
      <View testID={testID}>
        <Text style={styles.recapTitle}>{title}</Text>
        <Text style={styles.recapValue}>{recap?.submission_rate}% Pengisian</Text>
        <ProgressBar progress={(recap?.submission_rate || 0) / 100} />
        <Text style={styles.recapSub}>{recap?.prayer_berjamaah_rate}% Sholat Berjamaah</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  backText: { ...typography.bodyMedium, color: colors.brandPrimary, marginBottom: spacing.base },
  profileCard: { marginBottom: spacing.base },
  studentName: { ...typography.h2, color: colors.brand },
  studentMeta: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  recapRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.base },
  recapCard: { flex: 1 },
  recapTitle: { ...typography.caption, color: colors.onSurfaceTertiary },
  recapValue: { ...typography.h4, color: colors.onSurface, marginTop: 2, marginBottom: spacing.xs },
  recapSub: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: spacing.xs },
  sectionTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.sm },
  sectionSubtitle: { ...typography.bodyMedium, color: colors.brand, marginTop: spacing.sm, marginBottom: spacing.xs },
  reportCard: {},
  reportRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  reportLabel: { ...typography.body, color: colors.onSurfaceSecondary },
  reportValue: { ...typography.bodyMedium, color: colors.onSurface },
  reportNote: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: spacing.xs, fontStyle: "italic" },
  emptyText: { ...typography.body, color: colors.onSurfaceTertiary, textAlign: "center" },
});
