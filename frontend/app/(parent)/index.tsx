import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, spacing, typography } from "../../utils/theme";
import { Card, ProgressBar } from "../../components/ui";
import { PRAYER_TIMES, prayerLabel, sleepLabel, wakeLabel } from "../../constants/formOptions";

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Card style={styles.childCard}>
        <View testID="parent-child-header">
          <Text style={styles.childName}>{dashboard?.student?.name}</Text>
          <Text style={styles.childMeta}>Kelas {dashboard?.student?.class_id} · NIPD {dashboard?.student?.nipd}</Text>
          <Text style={styles.childMeta}>Guru Wali: {dashboard?.student?.teacher_name}</Text>
        </View>
      </Card>

      <Card style={[styles.statusCard, dashboard?.today_filled ? styles.statusDone : styles.statusPending]}>
        <View testID="parent-today-status">
          <Text style={styles.statusTitle}>
            {dashboard?.today_filled ? "Sudah mengisi kegiatan hari ini" : "Belum mengisi kegiatan hari ini"}
          </Text>
          {report && (
            <Text style={styles.statusSubtitle}>
              Terisi pukul {new Date(report.submitted_at).toLocaleTimeString("id-ID")}
              {report.submitted_late ? " (terlambat)" : ""}
            </Text>
          )}
        </View>
      </Card>

      {report && (
        <Card style={{ marginBottom: spacing.base }}>
          <Text style={styles.sectionTitle}>Sholat Fardhu Hari Ini</Text>
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

      <Text style={styles.sectionTitle}>Ringkasan Kebiasaan</Text>
      <View style={styles.summaryRow}>
        <SummaryCard testID="parent-summary-7days" title="7 Hari" summary={summary7} />
        <SummaryCard testID="parent-summary-30days" title="30 Hari" summary={summary30} />
      </View>
    </ScrollView>
  );
}

function SummaryCard({ testID, title, summary }: { testID: string; title: string; summary: any }) {
  return (
    <Card style={styles.summaryCard}>
      <View testID={testID}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={styles.summaryValue}>{summary?.submission_rate}% Isi Laporan</Text>
        <ProgressBar progress={(summary?.submission_rate || 0) / 100} />
        <Text style={styles.summarySub}>{summary?.prayer_berjamaah_rate}% Sholat Berjamaah</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  childCard: { marginBottom: spacing.base },
  childName: { ...typography.h2, color: colors.brand },
  childMeta: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  statusCard: { marginBottom: spacing.base },
  statusDone: { backgroundColor: colors.brandTertiary },
  statusPending: { backgroundColor: colors.prayerGoldLight },
  statusTitle: { ...typography.h4, color: colors.onSurface },
  statusSubtitle: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: spacing.xs },
  sectionTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.sm },
  reportRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  reportLabel: { ...typography.body, color: colors.onSurfaceSecondary },
  reportValue: { ...typography.bodyMedium, color: colors.onSurface },
  summaryRow: { flexDirection: "row", gap: spacing.sm },
  summaryCard: { flex: 1 },
  summaryTitle: { ...typography.caption, color: colors.onSurfaceTertiary },
  summaryValue: { ...typography.h4, color: colors.onSurface, marginTop: 2, marginBottom: spacing.xs },
  summarySub: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: spacing.xs },
});
