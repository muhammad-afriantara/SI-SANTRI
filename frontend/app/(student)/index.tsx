import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { colors, radii, spacing, typography } from "../../utils/theme";
import { Card, PrimaryButton, Badge } from "../../components/ui";

export default function StudentHome() {
  const { token, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest("/student/dashboard", { token });
      setData(res);
    } catch (e) {
      // silent fail, keep last state
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
      <View style={[styles.center, { paddingTop: insets.top }]} testID="student-home-loading">
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  const filled = data?.today_filled;
  const missedCount = data?.missed_dates?.length || 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting} testID="student-greeting-text">
        {"Assalamu'alaikum, "}
        {profile?.name?.split(" ")[0]}
      </Text>
      <View style={styles.metaRow}>
        <Badge label={`Kelas ${profile?.class_id}`} tone="info" />
        <Text style={styles.metaText}>Guru Wali: {profile?.teacher_name}</Text>
      </View>

      <Card style={[styles.statusCard, filled ? styles.statusCardDone : styles.statusCardPending]} >
        <View testID="student-status-banner">
          {filled ? (
            <>
              <Text style={styles.statusTitle}>Alhamdulillah, kegiatan hari ini sudah diisi!</Text>
              <Text style={styles.statusSubtitle}>Terima kasih sudah rutin mengisi laporan harian.</Text>
              <PrimaryButton
                title="Lihat / Ubah Laporan"
                onPress={() => router.push("/(student)/form")}
                testID="student-view-edit-report-button"
                style={{ marginTop: spacing.md }}
              />
            </>
          ) : (
            <>
              <Text style={styles.statusTitle}>Kegiatan hari ini belum diisi</Text>
              <Text style={styles.statusSubtitle}>Yuk, isi laporan kegiatan harianmu sekarang.</Text>
              <PrimaryButton
                title="Isi Kegiatan Hari Ini"
                onPress={() => router.push("/(student)/form")}
                testID="student-start-form-button"
                style={{ marginTop: spacing.md }}
              />
            </>
          )}
        </View>
      </Card>

      {missedCount > 0 && (
        <Card style={styles.backfillCard} >
          <View testID="student-backfill-banner">
            <Text style={styles.backfillTitle}>⏰ {missedCount} Hari Belum Diisi</Text>
            <Text style={styles.statusSubtitle}>
              Kamu punya {missedCount} hari sebelumnya yang belum dilengkapi. Yuk lengkapi sekarang!
            </Text>
            <PrimaryButton
              title="Lengkapi Hari Sebelumnya"
              onPress={() => router.push("/backfill")}
              variant="secondary"
              testID="student-backfill-button"
              style={{ marginTop: spacing.md }}
            />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  greeting: { ...typography.h1, color: colors.onSurface },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.lg, gap: spacing.sm },
  metaText: { ...typography.caption, color: colors.onSurfaceSecondary },
  statusCard: { marginBottom: spacing.base, borderRadius: radii.banner },
  statusCardDone: { backgroundColor: colors.brandTertiary, borderColor: colors.borderBrand },
  statusCardPending: { backgroundColor: colors.prayerGoldLight, borderColor: "#FDE68A" },
  statusTitle: { ...typography.h3, color: colors.onSurface },
  statusSubtitle: { ...typography.body, color: colors.onSurfaceSecondary, marginTop: spacing.xs },
  backfillCard: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  backfillTitle: { ...typography.h3, color: colors.warning },
});
