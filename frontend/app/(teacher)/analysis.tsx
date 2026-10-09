import React, { useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest, downloadCsv } from "../../utils/api";
import { colors, radii, spacing, typography } from "../../utils/theme";
import { Card, Chip, ProgressBar, Badge } from "../../components/ui";

export default function TeacherClassAnalysis() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingAnalysis, setFetchingAnalysis] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const latestReqIdRef = useRef(0);

  const loadData = useCallback(
    async (targetDays?: 7 | 14 | 30) => {
      const d = targetDays !== undefined ? targetDays : days;
      const reqId = ++latestReqIdRef.current;
      setFetchingAnalysis(true);

      try {
        const res = await apiRequest(`/teacher/class-character-analysis?days=${d}`, { token });
        if (reqId === latestReqIdRef.current) {
          setAnalysis(res);
        }
      } catch (e) {
        // silent
      } finally {
        if (reqId === latestReqIdRef.current) {
          setLoading(false);
          setFetchingAnalysis(false);
          setRefreshing(false);
        }
      }
    },
    [days, token]
  );

  const handleExport = async () => {
    setDownloading(true);
    try {
      const filename = `rekap_karakter_kelas_${days}hari.csv`;
      await downloadCsv(`/teacher/export-recap?days=${days}`, filename, token);
      Alert.alert(
        "Ekspor Berhasil",
        `Rekap karakter ${days} hari berhasil diunduh (${filename}). Anda dapat membukanya di Microsoft Excel.`
      );
    } catch (e: any) {
      Alert.alert("Gagal Ekspor", e.message || "Gagal mengunduh file rekap.");
    } finally {
      setDownloading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [token])
  );

  const handleDaysChange = (newDays: 7 | 14 | 30) => {
    if (newDays === days) return;
    setDays(newDays);
    loadData(newDays);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  const catAvgs = analysis?.category_averages || {};
  const avgClassScore = analysis?.class_average_score ?? 0;
  const progressRatio = Math.min(1, Math.max(0, avgClassScore / 87));
  const rankings = analysis?.student_rankings || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>Analisis Karakter Kelas</Text>
        <Text style={styles.headerSubtitle}>
          Evaluasi tren perilaku, ibadah, dan kebiasaan siswa per periode
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Filter Hari & Tombol Ekspor */}
        <View style={styles.actionRow}>
          <View style={styles.filterRow}>
            {([7, 14, 30] as const).map((d) => (
              <Chip
                key={d}
                label={`${d} Hari`}
                selected={days === d}
                onPress={() => handleDaysChange(d)}
              />
            ))}
            {fetchingAnalysis && (
              <ActivityIndicator size="small" color={colors.brandPrimary} style={{ marginLeft: spacing.xs }} />
            )}
          </View>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExport}
            disabled={downloading}
          >
            <Text style={styles.exportButtonText}>
              {downloading ? "⏳..." : "📥 Ekspor"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Skor Rata-rata Kelas */}
        <Card style={styles.mainScoreCard}>
          <Text style={styles.scoreCardTitle}>Rata-Rata Skor Karakter Kelas ({days} Hari)</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreBig}>
              {avgClassScore} <Text style={styles.scoreMax}>/ 87 Poin</Text>
            </Text>
            <Badge
              label={`${Math.round(progressRatio * 100)}% Capaian`}
              tone={avgClassScore >= 60 ? "success" : "warning"}
            />
          </View>
          <ProgressBar progress={progressRatio} style={{ marginVertical: spacing.sm }} />

          {/* Rincian 4 Kategori */}
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

        {/* KPI Indikator Kunci */}
        <Text style={styles.sectionTitle}>Indikator Kunci Pembiasaan</Text>
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiEmoji}>🕌</Text>
            <Text style={styles.kpiVal}>{analysis?.prayer_berjamaah_rate ?? 0}%</Text>
            <Text style={styles.kpiLbl}>Sholat Berjamaah</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiEmoji}>🌅</Text>
            <Text style={styles.kpiVal}>{analysis?.subuh_jamaah_rate ?? 0}%</Text>
            <Text style={styles.kpiLbl}>Subuh Berjamaah</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiEmoji}>📝</Text>
            <Text style={styles.kpiVal}>{analysis?.total_reports ?? 0}</Text>
            <Text style={styles.kpiLbl}>Total Jurnal Masuk</Text>
          </Card>
        </View>

        {/* Konsistensi & Peringkat Siswa */}
        <Text style={styles.sectionTitle}>Tingkat Konsistensi Siswa ({rankings.length})</Text>
        {rankings.map((st: any, idx: number) => {
          const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
          return (
            <Card key={st.student_id} style={styles.rankCard}>
              <View style={styles.rankRow}>
                <Text style={styles.rankMedal}>{medal}</Text>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.studentName}>{st.name}</Text>
                  <Text style={styles.studentMeta}>
                    NIPD: {st.nipd} · {st.filled_count} dari {days} hari terisi ({st.submission_rate}%)
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.studentScore}>{st.average_score} Poin</Text>
                  <Badge
                    label={st.submission_rate >= 80 ? "Sangat Rajin" : st.submission_rate >= 50 ? "Cukup" : "Perlu Bimbingan"}
                    tone={st.submission_rate >= 80 ? "success" : st.submission_rate >= 50 ? "info" : "warning"}
                  />
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
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
  headerSubtitle: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  filterRow: { flexDirection: "row", gap: spacing.xs },
  exportButton: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  exportButtonText: {
    ...typography.caption,
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  mainScoreCard: { marginBottom: spacing.lg },
  scoreCardTitle: { ...typography.caption, color: colors.onSurfaceSecondary },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: spacing.xs },
  scoreBig: { ...typography.h1, color: colors.brandPrimary },
  scoreMax: { ...typography.body, color: colors.onSurfaceSecondary },
  catGrid: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  catBox: { flex: 1, backgroundColor: colors.surface, padding: spacing.xs, borderRadius: radii.sm, alignItems: "center" },
  catVal: { ...typography.bodyMedium, color: colors.brandPrimary, fontWeight: "700" },
  catLbl: { fontSize: 10, color: colors.onSurfaceSecondary, textAlign: "center", marginTop: 2 },
  sectionTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.sm },
  kpiRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  kpiCard: { flex: 1, alignItems: "center", paddingVertical: spacing.md },
  kpiEmoji: { fontSize: 24, marginBottom: 4 },
  kpiVal: { ...typography.h3, color: colors.brandPrimary },
  kpiLbl: { fontSize: 11, color: colors.onSurfaceSecondary, textAlign: "center", marginTop: 2 },
  rankCard: { marginBottom: spacing.sm },
  rankRow: { flexDirection: "row", alignItems: "center" },
  rankMedal: { fontSize: 18, fontWeight: "bold", width: 28, textAlign: "center" },
  studentName: { ...typography.h4, color: colors.onSurface },
  studentMeta: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  studentScore: { ...typography.h4, color: colors.brandPrimary, fontWeight: "800", marginBottom: 2 },
});
