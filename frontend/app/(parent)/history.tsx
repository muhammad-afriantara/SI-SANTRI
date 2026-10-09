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
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, radii, spacing, typography } from "../../utils/theme";
import { Card, Badge, Chip, ProgressBar } from "../../components/ui";
import { prayerLabel } from "../../constants/formOptions";

export default function ParentProgress() {
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
        const res = await apiRequest(`/parent/child-progress?days=${d}`, { token });
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
          apiRequest(`/parent/child-progress?days=${d}`, { token }),
          apiRequest("/parent/reports", { token }),
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

  const avgTotal = progressData?.average_score ?? 0;
  const progressRatio = Math.min(1, Math.max(0, avgTotal / 87));
  const catAvgs = progressData?.category_averages || {};

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle} testID="parent-history-title">
          Perkembangan Karakter Anak
        </Text>
      </View>

      <FlatList
        testID="parent-history-list"
        data={reports}
        keyExtractor={(item) => item.activity_date}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.base }}>
            {/* Filter Hari */}
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
                  <Text style={styles.summaryScore}>
                    {avgTotal} <Text style={styles.summaryScoreMax}>/ 87 Poin</Text>
                  </Text>
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

            <Text style={styles.sectionHeader}>Riwayat Laporan Lengkap ({reports.length})</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText} testID="parent-history-empty">
            Belum ada riwayat kegiatan.
          </Text>
        }
        renderItem={({ item }) => {
          const scoreObj = item.scores || {};
          const totalScore = scoreObj.total ?? "-";
          const conf = item.parent_confirmation || {};
          const confStatus = conf.status || "pending";

          return (
            <Card style={styles.item}>
              <View testID={`parent-history-item-${item.activity_date}`}>
                <View style={styles.itemRow}>
                  <View>
                    <Text style={styles.itemDate}>{item.activity_date}</Text>
                    {scoreObj.total !== undefined && (
                      <Text style={styles.itemScoreText}>
                        ⭐ Total Skor: {totalScore}/87 Poin ({scoreObj.percentage ?? 0}%)
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    {item.submitted_late && <Badge label="Terlambat" tone="warning" />}
                    <Badge
                      label={
                        confStatus === "confirmed"
                          ? "✓ Terverifikasi"
                          : confStatus === "rejected"
                          ? "Perlu Perbaikan"
                          : "Menunggu Konfirmasi"
                      }
                      tone={
                        confStatus === "confirmed"
                          ? "success"
                          : confStatus === "rejected"
                          ? "error"
                          : "warning"
                      }
                    />
                  </View>
                </View>

                {/* Ringkasan Skor Kategori */}
                {scoreObj.ibadah !== undefined && (
                  <View style={styles.catChipsRow}>
                    <Text style={styles.catChipText}>Ibadah: {scoreObj.ibadah}</Text>
                    <Text style={styles.catChipDivider}>•</Text>
                    <Text style={styles.catChipText}>Belajar: {scoreObj.belajar}</Text>
                    <Text style={styles.catChipDivider}>•</Text>
                    <Text style={styles.catChipText}>Akhlak: {scoreObj.akhlak}</Text>
                    <Text style={styles.catChipDivider}>•</Text>
                    <Text style={styles.catChipText}>Diri: {scoreObj.pengembangan}</Text>
                  </View>
                )}

                <Text style={styles.itemDetail}>
                  Subuh: {prayerLabel(item.subuh)} · Maghrib: {prayerLabel(item.maghrib)} · Isya: {prayerLabel(item.isya)}
                </Text>

                {conf.parent_note && (
                  <View style={styles.notePreview}>
                    <Text style={styles.notePreviewText}>Catatan Anda: "{conf.parent_note}"</Text>
                  </View>
                )}
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.onSurface },
  filterRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  summaryTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  summaryLabel: { ...typography.caption, color: colors.onSurfaceSecondary },
  summaryScore: { ...typography.h1, color: colors.brandPrimary, marginVertical: spacing.xs },
  summaryScoreMax: { ...typography.body, color: colors.onSurfaceSecondary },
  badgeWrap: { marginTop: 4 },
  catGrid: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  catBox: { flex: 1, backgroundColor: colors.surface, padding: spacing.xs, borderRadius: radii.sm, alignItems: "center" },
  catVal: { ...typography.bodyMedium, color: colors.brandPrimary, fontWeight: "700" },
  catLbl: { fontSize: 10, color: colors.onSurfaceSecondary, textAlign: "center", marginTop: 2 },
  sectionHeader: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.sm },
  item: { marginBottom: spacing.sm },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.xs },
  itemDate: { ...typography.h4, color: colors.onSurface },
  itemScoreText: { ...typography.caption, color: colors.brandPrimary, fontWeight: "600", marginTop: 2 },
  catChipsRow: { flexDirection: "row", alignItems: "center", gap: 4, marginVertical: spacing.xs },
  catChipText: { fontSize: 11, color: colors.onSurfaceSecondary, fontWeight: "500" },
  catChipDivider: { fontSize: 11, color: colors.onSurfaceTertiary },
  itemDetail: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  notePreview: {
    marginTop: spacing.xs,
    padding: spacing.xs,
    backgroundColor: "#EFF6FF",
    borderRadius: radii.xs,
  },
  notePreviewText: { fontSize: 11, color: colors.info, fontStyle: "italic" },
  emptyText: { ...typography.body, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.xxl },
});
