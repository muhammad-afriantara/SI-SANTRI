import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, radii, spacing, typography, touchTargets } from "../../utils/theme";
import { Card, Badge } from "../../components/ui";

const STATUS_FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "sudah", label: "Sudah" },
  { key: "belum", label: "Belum" },
];

export default function TeacherDashboard() {
  const insets = useSafeAreaInsets();
  const { token, profile } = useAuth();
  const [kpi, setKpi] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [status, setStatus] = useState("semua");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadKpi = useCallback(async () => {
    const res = await apiRequest("/teacher/dashboard", { token });
    setKpi(res);
  }, [token]);

  const loadStudents = useCallback(async () => {
    const query = new URLSearchParams({ status, search }).toString();
    const res = await apiRequest(`/teacher/students?${query}`, { token });
    setStudents(res);
  }, [token, status, search]);

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([loadKpi(), loadStudents()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadKpi, loadStudents]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  useEffect(() => {
    if (!loading) {
      loadStudents();
    }
  }, [status, search, loading, loadStudents]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
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
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} testID="teacher-dashboard-title">Dashboard Guru</Text>
          <Text style={styles.headerSubtitle}>{profile?.name}</Text>
        </View>
        <TouchableOpacity
          testID="teacher-add-student-button"
          style={styles.addButton}
          onPress={() => router.push("/add-student")}
        >
          <Text style={styles.addButtonText}>+ Siswa</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        testID="teacher-student-list"
        data={students}
        keyExtractor={(item) => item.student_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        ListHeaderComponent={
          <View>
            <View style={styles.kpiGrid}>
              <KpiCard testID="teacher-kpi-total" label="Total Siswa" value={kpi?.total_students} />
              <KpiCard testID="teacher-kpi-submitted" label="Sudah Mengisi" value={kpi?.submitted_today} tone="success" />
              <KpiCard testID="teacher-kpi-pending" label="Belum Mengisi" value={kpi?.pending_today} tone="warning" />
              <KpiCard testID="teacher-kpi-percentage" label="Persentase" value={`${kpi?.percentage}%`} tone="info" />
            </View>

            <TextInput
              testID="teacher-search-input"
              value={search}
              onChangeText={setSearch}
              placeholder="Cari nama atau NIPD siswa..."
              placeholderTextColor={colors.onSurfaceTertiary}
              style={styles.searchInput}
            />

            <View style={styles.filterRow}>
              {STATUS_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  testID={`teacher-filter-${f.key === "semua" ? "all" : f.key}`}
                  style={[styles.filterChip, status === f.key && styles.filterChipActive]}
                  onPress={() => setStatus(f.key)}
                >
                  <Text style={[styles.filterChipText, status === f.key && styles.filterChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText} testID="teacher-student-list-empty">Tidak ada siswa ditemukan.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`teacher-student-item-${item.student_id}`}
            onPress={() => router.push(`/teacher-student/${item.student_id}`)}
          >
            <Card style={styles.studentCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.studentMeta}>NIPD: {item.nipd} · Kelas {item.class_id}</Text>
              </View>
              <Badge label={item.filled ? "Sudah" : "Belum"} tone={item.filled ? "success" : "warning"} />
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function KpiCard({ testID, label, value, tone = "info" }: { testID: string; label: string; value: any; tone?: "success" | "warning" | "info" }) {
  const fg = { success: colors.success, warning: colors.warning, info: colors.brand }[tone];
  return (
    <View style={styles.kpiCard} testID={testID}>
      <Text style={[styles.kpiValue, { color: fg }]}>{value ?? "-"}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  headerBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    backgroundColor: colors.surfaceElevated, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.onSurface },
  headerSubtitle: { ...typography.caption, color: colors.onSurfaceSecondary },
  addButton: { backgroundColor: colors.brandPrimary, borderRadius: radii.button, paddingHorizontal: spacing.base, minHeight: touchTargets.minHeight - 8, alignItems: "center", justifyContent: "center" },
  addButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.base },
  kpiCard: { flexBasis: "47%", flexGrow: 1, backgroundColor: colors.surfaceElevated, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: spacing.base },
  kpiValue: { fontSize: 24, fontWeight: "800" },
  kpiLabel: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 4 },
  searchInput: {
    minHeight: touchTargets.inputHeight, borderRadius: radii.button, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceElevated, paddingHorizontal: spacing.base, color: colors.onSurface, marginBottom: spacing.sm, ...typography.body,
  },
  filterRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.base },
  filterChip: { flexShrink: 0, height: 36, borderRadius: radii.chip, paddingHorizontal: spacing.base, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  filterChipText: { ...typography.caption, color: colors.onSurfaceSecondary, fontWeight: "700" },
  filterChipTextActive: { color: "#FFFFFF" },
  studentCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  studentName: { ...typography.bodyMedium, color: colors.onSurface, fontWeight: "700" },
  studentMeta: { ...typography.caption, color: colors.onSurfaceSecondary, marginTop: 2 },
  emptyText: { ...typography.body, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.xxl },
});
