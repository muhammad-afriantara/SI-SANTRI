import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, spacing, typography } from "../../utils/theme";
import { Card, Badge } from "../../components/ui";
import { prayerLabel } from "../../constants/formOptions";

export default function ParentHistory() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest("/parent/reports", { token });
      setReports(res);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
        <Text style={styles.headerTitle} testID="parent-history-title">Riwayat Kegiatan Anak</Text>
      </View>
      <FlatList
        testID="parent-history-list"
        data={reports}
        keyExtractor={(item) => item.activity_date}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        ListEmptyComponent={<Text style={styles.emptyText} testID="parent-history-empty">Belum ada riwayat kegiatan.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.item} >
            <View testID={`parent-history-item-${item.activity_date}`}>
              <View style={styles.itemRow}>
                <Text style={styles.itemDate}>{item.activity_date}</Text>
                {item.submitted_late && <Badge label="Terlambat" tone="warning" />}
              </View>
              <Text style={styles.itemDetail}>
                Subuh: {prayerLabel(item.subuh)} · Maghrib: {prayerLabel(item.maghrib)} · Isya: {prayerLabel(item.isya)}
              </Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  headerBar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surfaceElevated, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h2, color: colors.onSurface },
  item: { marginBottom: spacing.sm },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  itemDate: { ...typography.h4, color: colors.onSurface },
  itemDetail: { ...typography.caption, color: colors.onSurfaceSecondary },
  emptyText: { ...typography.body, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.xxl },
});
