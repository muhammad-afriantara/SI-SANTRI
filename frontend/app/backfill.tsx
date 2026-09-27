import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";
import { colors, spacing, typography } from "../utils/theme";
import { Card } from "../components/ui";

export default function BackfillScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [missedDates, setMissedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest("/student/dashboard", { token });
      setMissedDates(res.missed_dates || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity testID="backfill-back-button" onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} testID="backfill-title">Lengkapi Hari Terlewat</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.brandPrimary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          testID="backfill-list"
          data={missedDates}
          keyExtractor={(item) => item}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={<Text style={styles.emptyText} testID="backfill-empty">Tidak ada hari terlewat. Semua sudah lengkap!</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`backfill-item-${item}`}
              onPress={() => router.push({ pathname: "/(student)/form", params: { date: item } })}
            >
              <Card style={styles.item}>
                <Text style={styles.itemDate}>{item}</Text>
                <Text style={styles.itemHint}>Belum diisi · Ketuk untuk melengkapi</Text>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surfaceElevated, borderBottomWidth: 1, borderBottomColor: colors.border },
  backText: { ...typography.bodyMedium, color: colors.brandPrimary, marginBottom: spacing.sm },
  headerTitle: { ...typography.h2, color: colors.onSurface },
  item: { marginBottom: spacing.sm },
  itemDate: { ...typography.h4, color: colors.onSurface },
  itemHint: { ...typography.caption, color: colors.warning, marginTop: spacing.xs },
  emptyText: { ...typography.body, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.xxl },
});
