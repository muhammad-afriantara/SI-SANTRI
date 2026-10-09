import React, { useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, radii, spacing, typography } from "../../utils/theme";
import { Card, Badge, Chip, ProgressBar } from "../../components/ui";
import { prayerLabel } from "../../constants/formOptions";

export default function StudentProgress() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [progressData, setProgressData] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingProgress, setFetchingProgress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const latestReqIdRef = useRef(0);

  const loadProgress = useCallback(
    async (targetDays?: 7 | 14 | 30) => {
      const d = targetDays !== undefined ? targetDays : days;
      const reqId = ++latestReqIdRef.current;
      setFetchingProgress(true);

      try {
        const res = await apiRequest(`/student/progress?days=${d}`, { token });
        if (reqId === latestReqIdRef.current) {
          setProgressData(res);
        }
      } catch (e) {
        // silent
      } finally {
        if (reqId === latestReqIdRef.current) {
          setFetchingProgress(false);
        }
      }
    },
    [days, token]
  );

  const loadAll = useCallback(
    async (targetDays?: 7 | 14 | 30) => {
      const d = targetDays !== undefined ? targetDays : days;
      try {
        const [prog, rep] = await Promise.all([
          apiRequest(`/student/progress?days=${d}`, { token }),
          apiRequest("/student/reports", { token }),
        ]);
        setProgressData(prog);
        setReports(rep || []);
      } catch (e) {
        // silent
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days, token]
  );

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [token])
  );

  const handleDaysChange = (newDays: 7 | 14 | 30) => {
    if (newDays === days) return;
    setDays(newDays);
    loadProgress(newDays);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAll(days);
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  const avgTotal = progressData?.average_score || 0;
  const maxPossible = 87;
  const progressRatio = maxPossible > 0 ? Math.min(1, Math.max(0, avgTotal / maxPossible)) : 0;
  const catAvgs = progressData?.category_averages || {};

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle} testID="student-progress-title">Perkembangan Karakter</Text>
        <Text style={styles.headerSubtitle}>Grafik Progres & Riwayat Laporan Santri</Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.activity_date}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.base }}>
            {/* Range Filter */}
            <View style={styles.filterRow}>
              {([7, 14, 30] as const).map((d) => (
                <Chip
                  key={d}
                  label={`${d} Hari`}
                  selected={days === d}
                  onPress={() => handleDaysChange(d)}
                />
              ))}
              {fetchingProgress && (
                <ActivityIndicator size="small" color={colors.brandPrimary} style={{ marginLeft: spacing.xs }} />
              )}
            </View>

            {/* Card Ringkasan Progres */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.summaryLabel}>Rata-Rata Skor Karakter ({days} Hari)</Text>
                  <Text style={styles.summaryScore}>{avgTotal} <Text style={styles.summaryScoreMax}>/ 87 Poin</Text></Text>
                </View>
                <View style={styles.badgeWrap}>
                  <Badge
                    label={`${progressData?.submission_rate || 0}% Terisi`}
                    tone={progressData?.submission_rate >= 80 ? "success" : "warning"}
                  />
                </View>
              </View>

              <ProgressBar progress={progressRatio} style={{ marginVertical: spacing.sm }} />

              <View style={styles.catGrid}>
                <View style={styles.catBox}>
                  <Text style={styles.catVal}>{catAvgs.ibadah ?? 0}</Text>
                  <Text style={styles.catLbl}>Ibadah (Maks 20)</Text>
                </View>
                <View style={styles.catBox}>
                  <Text style={styles.catVal}>{catAvgs.belajar ?? 0}</Text>
                  <Text style={styles.catLbl}>Belajar (Maks 39)</Text>
                </View>
                <View style={styles.catBox}>
                  <Text style={styles.catVal}>{catAvgs.akhlak ?? 0}</Text>
                  <Text style={styles.catLbl}>Akhlak (Maks 15)</Text>
                </View>
                <View style={styles.catBox}>
                  <Text style={styles.catVal}>{catAvgs.pengembangan ?? 0}</Text>
                  <Text style={styles.catLbl}>Diri (Maks 13)</Text>
                </View>
              </View>
            </Card>

            <Text style={styles.sectionHeader}>Riwayat Laporan Harian ({reports.length})</Text>
          </View>
        }
        renderItem={({ item }) => {
          const scoreObj = item.scores || {};
          const totalScore = scoreObj.total ?? "-";
          return (
            <TouchableOpacity
              testID={`student-history-item-${item.activity_date}`}
              onPress={() => router.push({ pathname: "/(student)/form", params: { date: item.activity_date } })}
            >
              <Card style={styles.reportCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportDate}>{item.activity_date}</Text>
                    <Text style={styles.reportSubtitle}>
                      Subuh: {prayerLabel(item.subuh)} · Dzuhur: {prayerLabel(item.dzuhur)} · Ashar: {prayerLabel(item.ashar)}
                    </Text>
                  </View>
                  <View style={styles.scorePill}>
                    <Text style={styles.scorePillText}>⭐ {totalScore} Poin</Text>
                  </View>
                </View>

                {item.scores && (
                  <View style={styles.scoreBreakdownRow}>
                    <Text style={styles.scorePart}>Ibadah: {scoreObj.ibadah ?? 0}</Text>
                    <Text style={styles.scoreDot}>·</Text>
                    <Text style={styles.scorePart}>Belajar: {scoreObj.belajar ?? 0}</Text>
                    <Text style={styles.scoreDot}>·</Text>
                    <Text style={styles.scorePart}>Akhlak: {scoreObj.akhlak ?? 0}</Text>
                    <Text style={styles.scoreDot}>·</Text>
                    <Text style={styles.scorePart}>Diri: {scoreObj.pengembangan ?? 0}</Text>
                  </View>
                )}

                {item.submitted_late && (
                  <View style={{ marginTop: spacing.xs }}>
                    <Badge label="Diisi Terlambat (Backfill)" tone="warning" />
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Belum ada riwayat pengisian jurnal.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.onSurface },
  headerSubtitle: { ...typography.caption, color: colors.onSurfaceSecondary },
  filterRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md },
  summaryCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  summaryTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  summaryLabel: { ...typography.caption, color: colors.onSurfaceSecondary },
  summaryScore: { fontSize: 24, fontWeight: "800", color: "#065F46", marginTop: 2 },
  summaryScoreMax: { fontSize: 14, fontWeight: "600", color: colors.onSurfaceTertiary },
  badgeWrap: { alignSelf: "flex-start" },
  catGrid: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs },
  catBox: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.badge,
    padding: spacing.xs,
    alignItems: "center",
  },
  catVal: { fontSize: 13, fontWeight: "800", color: "#065F46" },
  catLbl: { ...typography.tiny, color: colors.onSurfaceTertiary, marginTop: 2, textAlign: "center" },
  sectionHeader: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.xs },
  reportCard: {
    marginBottom: spacing.sm,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  reportDate: { ...typography.h4, color: colors.onSurface },
  reportSubtitle: { ...typography.caption, color: colors.onSurfaceTertiary, marginTop: 2 },
  scorePill: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: radii.button,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  scorePillText: { fontSize: 12, fontWeight: "800", color: "#047857" },
  scoreBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSecondary,
  },
  scorePart: { ...typography.caption, color: colors.onSurfaceSecondary, fontSize: 11 },
  scoreDot: { marginHorizontal: 4, color: colors.onSurfaceTertiary },
  emptyText: { ...typography.body, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.xxl },
});
